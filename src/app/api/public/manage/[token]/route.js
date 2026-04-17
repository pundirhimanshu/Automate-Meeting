import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendBookingCancellation, sendBookingReschedule } from '@/lib/email';
import { triggerWebhook } from '@/lib/webhook-dispatcher';

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
            include: {
                eventType: { include: { user: true, coHosts: true } },
                host: true
            },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (booking.status === 'cancelled') {
            return NextResponse.json({ error: 'This booking is already cancelled' }, { status: 400 });
        }

        // --- Notification Logic Helper ---
        let hostRecipients = [];
        if (booking.eventType.type === 'round-robin' || booking.eventType.type === 'collective' || booking.eventType.type === 'group') {
            const rawRecipients = [booking.eventType.user, ...booking.eventType.coHosts];
            hostRecipients = Array.from(new Map(rawRecipients.map(r => [r.id, r])).values());
        } else {
            hostRecipients = [booking.eventType.user];
        }

        if (action === 'cancel') {
            await prisma.booking.update({
                where: { manageToken: token },
                data: { status: 'cancelled', cancelReason: cancelReason || 'Cancelled by invitee' },
            });

            // Notify all relevant hosts
            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_cancelled',
                        title: 'Booking Cancelled by Invitee',
                        message: `${booking.inviteeName} cancelled "${booking.eventType.title}" for ${new Date(booking.startTime).toLocaleDateString()}`,
                        bookingId: booking.id,
                    },
                })
            ));

            // Send cancellation email
            await sendBookingCancellation({
                booking,
                eventType: booking.eventType,
                host: booking.host,
                coHosts: hostRecipients.filter(r => r.id !== booking.hostId),
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                startTime: booking.startTime,
                cancelReason: cancelReason || 'Cancelled by invitee',
                timezone: booking.timezone,
            });

            // Trigger Webhook
            triggerWebhook(booking.hostId, 'booking.cancelled', {
                bookingId: booking.id,
                eventTitle: booking.eventType.title,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                startTime: booking.startTime,
                endTime: booking.endTime,
                cancelReason: cancelReason || 'Cancelled by invitee',
                cancel_reason: cancelReason || 'Cancelled by invitee', // Added for snake_case compatibility
                timezone: booking.timezone,
                status: 'cancelled'
            }, { eventTypeId: booking.eventTypeId }).catch(e => console.error('Webhook trigger error:', e));

            return NextResponse.json({ message: 'Booking cancelled successfully' });
        }

        if (action === 'reschedule') {
            if (!startTime || !endTime) {
                return NextResponse.json({ error: 'New time is required' }, { status: 400 });
            }

            // --- Specialized Conflict Check ---
            let conflict = false;
            if (booking.eventType.type === 'group') {
                // Group: Check if the new slot is full
                const groupBookingsCount = await prisma.booking.count({
                    where: {
                        eventTypeId: booking.eventTypeId,
                        startTime: new Date(startTime),
                        endTime: new Date(endTime),
                        status: { in: ['confirmed', 'pending', 'rescheduled'] },
                        id: { not: booking.id },
                    }
                });
                if (groupBookingsCount >= (booking.eventType.inviteeLimit || 1)) {
                    conflict = true;
                }
            } else if (booking.eventType.type === 'collective') {
                // Collective: All hosts must be free
                const hostIds = [booking.eventType.userId, ...booking.eventType.coHosts.map(ch => ch.id)];
                const hostConflict = await prisma.booking.findFirst({
                    where: {
                        hostId: { in: hostIds },
                        status: { in: ['confirmed', 'pending', 'rescheduled'] },
                        id: { not: booking.id },
                        OR: [
                            { AND: [{ startTime: { lte: new Date(startTime) } }, { endTime: { gt: new Date(startTime) } }] },
                            { AND: [{ startTime: { lt: new Date(endTime) } }, { endTime: { gte: new Date(endTime) } }] },
                        ],
                    }
                });
                if (hostConflict) conflict = true;
            } else {
                // One-on-one or Round Robin: The assigned host must be free
                const hostConflict = await prisma.booking.findFirst({
                    where: {
                        hostId: booking.hostId,
                        status: { in: ['confirmed', 'pending', 'rescheduled'] },
                        id: { not: booking.id },
                        OR: [
                            { AND: [{ startTime: { lte: new Date(startTime) } }, { endTime: { gt: new Date(startTime) } }] },
                            { AND: [{ startTime: { lt: new Date(endTime) } }, { endTime: { gte: new Date(endTime) } }] },
                        ],
                    }
                });
                if (hostConflict) conflict = true;
            }

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

            // Notify all relevant hosts
            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_rescheduled',
                        title: 'Booking Rescheduled by Invitee',
                        message: `${booking.inviteeName} rescheduled "${booking.eventType.title}" to ${new Date(startTime).toLocaleDateString()}`,
                        bookingId: booking.id,
                    },
                })
            ));

            // Send reschedule emails
            await sendBookingReschedule({
                booking,
                eventType: booking.eventType,
                host: booking.host,
                coHosts: hostRecipients.filter(r => r.id !== booking.hostId),
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                originalStartTime: booking.startTime,
                originalEndTime: booking.endTime,
                newStartTime: new Date(startTime),
                newEndTime: new Date(endTime),
                timezone: booking.timezone,
            });

            // Trigger Webhook
            triggerWebhook(booking.hostId, 'booking.rescheduled', {
                bookingId: booking.id,
                eventTitle: booking.eventType.title,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                originalStartTime: booking.startTime,
                newStartTime: new Date(startTime),
                newEndTime: new Date(endTime),
                timezone: booking.timezone,
                status: 'rescheduled',
                cancel_reason: ''
            }, { eventTypeId: booking.eventTypeId }).catch(e => console.error('Webhook trigger error:', e));

            return NextResponse.json({ message: 'Booking rescheduled successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error managing booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
