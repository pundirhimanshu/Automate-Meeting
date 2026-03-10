import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendBookingCancellation, sendBookingReschedule } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { action, cancelReason, startTime, endTime } = body;

        const booking = await prisma.booking.findUnique({
            where: { id: params.id },
            include: { eventType: { include: { user: true, coHosts: true } } },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (action === 'cancel') {
            await prisma.booking.update({
                where: { id: params.id },
                data: { status: 'cancelled', cancelReason: cancelReason || '' },
            });

            // Notify Host
            await prisma.notification.create({
                data: {
                    userId: booking.hostId,
                    type: 'booking_cancelled',
                    title: 'Booking Cancelled',
                    message: `${booking.inviteeName} cancelled "${booking.eventType.title}"`,
                    bookingId: booking.id,
                },
            });

            // Notify Co-hosts
            if (booking.eventType.coHosts && booking.eventType.coHosts.length > 0) {
                await Promise.all(booking.eventType.coHosts.map(coHost =>
                    prisma.notification.create({
                        data: {
                            userId: coHost.id,
                            type: 'booking_cancelled',
                            title: 'Booking Cancelled (Co-host)',
                            message: `${booking.inviteeName} cancelled "${booking.eventType.title}" with you and ${booking.eventType.user.name}`,
                            bookingId: booking.id,
                        },
                    })
                ));
            }

            // Send cancellation email
            await sendBookingCancellation({
                booking,
                eventType: booking.eventType,
                host: booking.eventType.user,
                coHosts: booking.eventType.coHosts,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                startTime: booking.startTime,
                cancelReason: cancelReason || '',
                timezone: booking.timezone,
            });

            return NextResponse.json({ message: 'Booking cancelled' });
        }

        if (action === 'reschedule') {
            if (!startTime || !endTime) {
                return NextResponse.json({ error: 'New time required' }, { status: 400 });
            }

            await prisma.booking.update({
                where: { id: params.id },
                data: {
                    rescheduledFromStart: booking.startTime,
                    rescheduledFromEnd: booking.endTime,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    status: 'rescheduled',
                },
            });

            // Notify Host
            await prisma.notification.create({
                data: {
                    userId: booking.hostId,
                    type: 'booking_rescheduled',
                    title: 'Booking Rescheduled',
                    message: `${booking.inviteeName} rescheduled "${booking.eventType.title}" to ${new Date(startTime).toLocaleDateString()}`,
                    bookingId: booking.id,
                },
            });

            // Notify Co-hosts
            if (booking.eventType.coHosts && booking.eventType.coHosts.length > 0) {
                await Promise.all(booking.eventType.coHosts.map(coHost =>
                    prisma.notification.create({
                        data: {
                            userId: coHost.id,
                            type: 'booking_rescheduled',
                            title: 'Booking Rescheduled (Co-host)',
                            message: `${booking.inviteeName} rescheduled "${booking.eventType.title}" with you and ${booking.eventType.user.name} to ${new Date(startTime).toLocaleDateString()}`,
                            bookingId: booking.id,
                        },
                    })
                ));
            }

            // Send reschedule emails to invitee and hosts
            await sendBookingReschedule({
                booking,
                eventType: booking.eventType,
                host: booking.eventType.user,
                coHosts: booking.eventType.coHosts,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                originalStartTime: booking.startTime,
                originalEndTime: booking.endTime,
                newStartTime: new Date(startTime),
                newEndTime: new Date(endTime),
                timezone: booking.timezone,
            });

            return NextResponse.json({ message: 'Booking rescheduled' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
