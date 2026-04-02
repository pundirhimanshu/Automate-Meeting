import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendBookingCancellation, sendBookingReschedule, sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { decrypt } from '@/lib/encryption';
import DodoPayments from 'dodopayments';

export const dynamic = 'force-dynamic';
  
export async function GET(request, { params }) {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: params.id },
            include: {
                host: true,
                eventType: {
                    select: {
                        id: true,
                        title: true,
                        duration: true,
                        location: true,
                        description: true,
                        user: { select: { name: true, avatar: true, logo: true, brandColor: true } }
                    }
                }
            }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // --- Double-check Payment status if still pending ---
        if (booking.status === 'pending' && booking.paymentSessionId) {
            try {
                // Get host's decrypted API key
                const dodoApiKey = decrypt(booking.host.dodoApiKey);
                const dodo = new DodoPayments({
                    bearerToken: dodoApiKey,
                });

                const session = await dodo.checkoutSessions.retrieve(booking.paymentSessionId);
                
                // If paid, confirm it now!
                if (session.status === 'completed' || session.status === 'paid' || session.payment_status === 'paid') {
                    console.log(`[BOOKING_VERIFY] Payment confirmed via API for ${booking.id}. Updating status.`);
                    
                    const updatedBooking = await prisma.booking.update({
                        where: { id: booking.id },
                        data: { 
                            status: 'confirmed',
                            paymentStatus: 'paid' 
                        },
                        include: { eventType: true, host: true }
                    });

                    // Trigger emails & workflows (Same as webhook)
                    triggerWorkflows('EVENT_BOOKED', updatedBooking.id).catch(console.error);
                    
                    const origin = request.headers.get('origin') || '';
                    const manageUrl = updatedBooking.manageToken ? `${origin}/book/manage/${updatedBooking.manageToken}` : '';

                    await sendBookingConfirmation({
                        booking: updatedBooking,
                        eventType: updatedBooking.eventType,
                        host: updatedBooking.host,
                        coHosts: [],
                        inviteeName: updatedBooking.inviteeName,
                        inviteeEmail: updatedBooking.inviteeEmail,
                        startTime: updatedBooking.startTime,
                        manageUrl,
                        timezone: updatedBooking.timezone,
                    });

                    return NextResponse.json({ booking: updatedBooking });
                }
            } catch (err) {
                console.error('[BOOKING_VERIFY_ERROR]', err);
            }
        }

        return NextResponse.json({ booking });
    } catch (error) {
        console.error('Error fetching booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
  
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
        if (booking.eventType.type === 'round-robin' || booking.eventType.type === 'collective' || booking.eventType.type === 'group') {
            const rawRecipients = [booking.eventType.user, ...booking.eventType.coHosts];
            hostRecipients = Array.from(new Map(rawRecipients.map(r => [r.id, r])).values());
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

            // Trigger Workflows
            triggerWorkflows('EVENT_CANCELED', booking.id).catch(e => console.error('Workflow trigger error:', e));

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

            // Trigger Workflows
            triggerWorkflows('EVENT_RESCHEDULED', booking.id).catch(e => console.error('Workflow trigger error:', e));

            return NextResponse.json({ message: 'Booking rescheduled' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
