import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendBookingCancellation, sendBookingReschedule } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET: Fetch booking details by manage token (public, no auth)
export async function GET(request, { params }) {
    try {
        const { token } = params;

        const booking = await prisma.booking.findUnique({
            where: { manageToken: token },
            include: {
                eventType: {
                    include: {
                        user: {
                            select: { id: true, name: true, username: true, brandColor: true, timezone: true, logo: true, email: true },
                        },
                        customQuestions: { orderBy: { order: 'asc' } },
                    },
                },
            },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Fetch host availability for reschedule calendar
        const schedule = await prisma.schedule.findFirst({
            where: { userId: booking.hostId, isDefault: true },
            include: {
                availabilities: true,
                dateOverrides: true,
            },
        });

        const existingBookings = await prisma.booking.findMany({
            where: {
                hostId: booking.hostId,
                status: { in: ['confirmed', 'pending', 'rescheduled'] },
                startTime: { gte: new Date() },
                id: { not: booking.id },
            },
            select: { startTime: true, endTime: true },
        });

        return NextResponse.json({
            booking: {
                id: booking.id,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                timezone: booking.timezone,
                notes: booking.notes,
                location: booking.location,
                cancelReason: booking.cancelReason,
                rescheduledFromStart: booking.rescheduledFromStart,
                rescheduledFromEnd: booking.rescheduledFromEnd,
            },
            eventType: {
                id: booking.eventType.id,
                title: booking.eventType.title,
                duration: booking.eventType.duration,
                color: booking.eventType.color,
                type: booking.eventType.type,
                location: booking.eventType.location,
                locationType: booking.eventType.locationType,
                bufferTimeBefore: booking.eventType.bufferTimeBefore,
                bufferTimeAfter: booking.eventType.bufferTimeAfter,
                minNotice: booking.eventType.minNotice,
            },
            host: {
                name: booking.eventType.user.name,
                brandColor: booking.eventType.user.brandColor,
                logo: booking.eventType.user.logo,
            },
            availability: schedule?.availabilities || [],
            dateOverrides: schedule?.dateOverrides || [],
            existingBookings,
        });
    } catch (error) {
        console.error('Error fetching manage booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// PUT: Cancel or reschedule from invitee side
export async function PUT(request, { params }) {
    try {
        const { token } = params;
        const body = await request.json();
        const { action, cancelReason, startTime, endTime } = body;

        const booking = await prisma.booking.findUnique({
            where: { manageToken: token },
            include: { eventType: { include: { user: true } } },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (booking.status === 'cancelled') {
            return NextResponse.json({ error: 'This booking is already cancelled' }, { status: 400 });
        }

        if (action === 'cancel') {
            await prisma.booking.update({
                where: { manageToken: token },
                data: { status: 'cancelled', cancelReason: cancelReason || 'Cancelled by invitee' },
            });

            await prisma.notification.create({
                data: {
                    userId: booking.hostId,
                    type: 'booking_cancelled',
                    title: 'Booking Cancelled by Invitee',
                    message: `${booking.inviteeName} cancelled "${booking.eventType.title}" for ${new Date(booking.startTime).toLocaleDateString()}`,
                    bookingId: booking.id,
                },
            });

            // Send cancellation emails to both parties
            await sendBookingCancellation({
                booking,
                eventType: booking.eventType,
                host: booking.eventType.user,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                startTime: booking.startTime,
                cancelReason: cancelReason || 'Cancelled by invitee',
            });

            return NextResponse.json({ message: 'Booking cancelled successfully' });
        }

        if (action === 'reschedule') {
            if (!startTime || !endTime) {
                return NextResponse.json({ error: 'New time is required' }, { status: 400 });
            }

            // Check for conflicts
            const conflict = await prisma.booking.findFirst({
                where: {
                    hostId: booking.hostId,
                    status: { in: ['confirmed', 'pending', 'rescheduled'] },
                    id: { not: booking.id },
                    OR: [
                        { AND: [{ startTime: { lte: new Date(startTime) } }, { endTime: { gt: new Date(startTime) } }] },
                        { AND: [{ startTime: { lt: new Date(endTime) } }, { endTime: { gte: new Date(endTime) } }] },
                    ],
                },
            });

            if (conflict) {
                return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
            }

            await prisma.booking.update({
                where: { manageToken: token },
                data: {
                    rescheduledFromStart: booking.startTime,
                    rescheduledFromEnd: booking.endTime,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    status: 'rescheduled',
                },
            });

            await prisma.notification.create({
                data: {
                    userId: booking.hostId,
                    type: 'booking_rescheduled',
                    title: 'Booking Rescheduled by Invitee',
                    message: `${booking.inviteeName} rescheduled "${booking.eventType.title}" to ${new Date(startTime).toLocaleDateString()}`,
                    bookingId: booking.id,
                },
            });

            // Send reschedule emails to both parties
            await sendBookingReschedule({
                booking,
                eventType: booking.eventType,
                host: booking.eventType.user,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                originalStartTime: booking.startTime,
                originalEndTime: booking.endTime,
                newStartTime: new Date(startTime),
                newEndTime: new Date(endTime),
            });

            return NextResponse.json({ message: 'Booking rescheduled successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error managing booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
