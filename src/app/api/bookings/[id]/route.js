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
            include: {
                eventType: { include: { user: true, coHosts: true } },
                host: true
            },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // --- Notification Logic Helper ---
        let hostRecipients = [];
        if (booking.eventType.type === 'round-robin') {
            hostRecipients = [booking.host];
        } else if (booking.eventType.type === 'collective' || booking.eventType.type === 'group') {
            hostRecipients = [booking.eventType.user, ...booking.eventType.coHosts];
        } else {
            hostRecipients = [booking.eventType.user];
        }

        if (action === 'cancel') {
            await prisma.booking.update({
                where: { id: params.id },
                data: { status: 'cancelled', cancelReason: cancelReason || '' },
            });

            // Notify all relevant hosts
            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_cancelled',
                        title: 'Booking Cancelled',
                        message: `${booking.inviteeName} cancelled "${booking.eventType.title}"`,
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

            // Notify all relevant hosts
            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_rescheduled',
                        title: 'Booking Rescheduled',
                        message: `${booking.inviteeName} rescheduled "${booking.eventType.title}" to ${new Date(startTime).toLocaleDateString()}`,
                        bookingId: booking.id,
                    },
                })
            ));

            // Send reschedule emails to invitee and hosts
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

            return NextResponse.json({ message: 'Booking rescheduled' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
