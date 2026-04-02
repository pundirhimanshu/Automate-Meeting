import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { createGoogleCalendarEvent } from '@/lib/integrations/google';
import DodoPayments from 'dodopayments';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const hostId = searchParams.get('hostId');

        if (!hostId) {
            console.error('[DODO_WEBHOOK] Missing hostId in query');
            return new Response('Missing hostId', { status: 400 });
        }

        // 1. Fetch host details
        const host = await prisma.user.findUnique({
            where: { id: hostId },
            select: { dodoWebhookSecret: true, id: true, name: true, email: true }
        });

        if (!host || !host.dodoWebhookSecret) {
            console.error('[DODO_WEBHOOK] Host not found or not configured:', hostId);
            return new Response('Host not configured', { status: 404 });
        }

        // 2. Decrypt host secret
        const webhookSecret = decrypt(host.dodoWebhookSecret);

        // 3. Get raw body and headers for verification
        const rawBody = await request.text();
        const headers = {
            'webhook-id': request.headers.get('webhook-id') || '',
            'webhook-signature': request.headers.get('webhook-signature') || '',
            'webhook-timestamp': request.headers.get('webhook-timestamp') || '',
        };

        // 4. Verify signature using the host's secret
        let event;
        try {
            const client = new DodoPayments({
                webhookKey: webhookSecret,
            });
            event = client.webhooks.unwrap(rawBody, { headers });
        } catch (err) {
            console.error('[DODO_WEBHOOK] Signature verification failed for host:', hostId, err.message);
            return new Response('Invalid signature', { status: 401 });
        }

        // 5. Handle the event
        if (event.event_type === 'checkout.session.completed') {
            const bookingId = event.data.metadata?.bookingId;

            if (!bookingId) {
                console.error('[DODO_WEBHOOK] No bookingId in metadata');
                return new Response('Missing bookingId', { status: 200 }); // Still return 200 to acknowledge
            }

            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { eventType: true, host: true }
            });

            if (!booking) {
                console.error('[DODO_WEBHOOK] Booking not found:', bookingId);
                return new Response('Booking not found', { status: 200 });
            }

            if (booking.status === 'confirmed') {
                console.log('[DODO_WEBHOOK] Booking already confirmed:', bookingId);
                return new Response('Already processed', { status: 200 });
            }

            // 6. Update Booking status
            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'confirmed',
                    paymentStatus: 'paid',
                },
                include: { eventType: true, host: true }
            });

            console.log('[DODO_WEBHOOK] Payment confirmed, finalizing booking:', bookingId);

            // 7. Finalize Booking (Emails, Workflows, Sync)
            
            // Trigger Workflows
            triggerWorkflows('EVENT_BOOKED', updatedBooking.id).catch(e => console.error('Workflow trigger error:', e));

            // Create in-app notification for host
            await prisma.notification.create({
                data: {
                    userId: hostId,
                    type: 'booking_confirmed',
                    title: 'Payment Received',
                    message: `${updatedBooking.inviteeName} paid for "${updatedBooking.eventType.title}"`,
                    bookingId: updatedBooking.id,
                },
            });

            // Google Calendar Sync
            if (updatedBooking.eventType.locationType !== 'none') {
                try {
                    await createGoogleCalendarEvent({
                        title: `${updatedBooking.inviteeName} & ${updatedBooking.eventType.title}`,
                        description: `Paid Booking via Scheduler\n\nInvitee: ${updatedBooking.inviteeName}\nEmail: ${updatedBooking.inviteeEmail}`,
                        location: updatedBooking.location || '',
                        startTime: updatedBooking.startTime,
                        endTime: updatedBooking.endTime,
                        attendeeEmail: updatedBooking.inviteeEmail,
                        userId: hostId,
                    });
                } catch (calErr) {
                    console.log('[DODO_WEBHOOK] Optional Google Calendar sync failed/skipped');
                }
            }

            // Send confirmation emails
            const origin = request.headers.get('origin') || `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}` || '';
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
        }

        return new Response('Webhook processed', { status: 200 });
    } catch (error) {
        console.error('[DODO_WEBHOOK_ERROR]', error);
        return new Response('Webhook error', { status: 500 });
    }
}
