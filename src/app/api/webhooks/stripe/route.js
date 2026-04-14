import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { createGoogleCalendarEvent } from '@/lib/integrations/google';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    console.log('[STRIPE_WEBHOOK] Incoming webhook...');
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('stripe-signature');

        // 1. Initial insecure parse to extract metadata (needed to find the correct secret)
        const unverifiedEvent = JSON.parse(rawBody);
        
        if (unverifiedEvent.type !== 'checkout.session.completed') {
            console.log('[STRIPE_WEBHOOK] Ignoring event type:', unverifiedEvent.type);
            return new Response('Event ignored', { status: 200 });
        }

        const session = unverifiedEvent.data.object;
        const bookingId = session.metadata?.bookingId;

        if (!bookingId) {
            console.warn('[STRIPE_WEBHOOK] No bookingId in metadata');
            return new Response('No bookingId', { status: 200 });
        }

        // 2. Lookup the booking and host user to find the secret
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { host: true },
        });

        if (!booking) {
            console.error('[STRIPE_WEBHOOK] Booking not found for verification:', bookingId);
            return new Response('Booking not found', { status: 200 });
        }

        const hostUser = booking.host;
        let event;
        let stripe;

        // 3. SECURE VERIFICATION
        try {
            if (hostUser.stripeAccountId) {
                // Connect Platform Mode
                const platformSecret = process.env.STRIPE_WEBHOOK_SECRET;
                if (!platformSecret && process.env.NODE_ENV === 'production') {
                    throw new Error('Missing platform webhook secret');
                }
                
                stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
                event = platformSecret 
                    ? stripe.webhooks.constructEvent(rawBody, signature, platformSecret)
                    : unverifiedEvent;
            } else if (hostUser.stripeSecretKey) {
                // Manual Keys Mode
                const userSecretKey = decrypt(hostUser.stripeSecretKey);
                const userWebhookSecret = hostUser.stripeWebhookSecret ? decrypt(hostUser.stripeWebhookSecret) : null;
                
                if (!userWebhookSecret && process.env.NODE_ENV === 'production') {
                    throw new Error('User has not set up a webhook secret');
                }

                stripe = new Stripe(userSecretKey);
                event = userWebhookSecret
                    ? stripe.webhooks.constructEvent(rawBody, signature, userWebhookSecret)
                    : unverifiedEvent;
            } else {
                throw new Error('Host has no Stripe configuration');
            }
        } catch (err) {
            console.error('[STRIPE_WEBHOOK] Verification failed:', err.message);
            return new Response(`Signature verification failed: ${err.message}`, { status: 401 });
        }

        // 4. PROCESS THE EVENT
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            
            console.log('[STRIPE_WEBHOOK] Processing payment for booking:', booking.id);

            // Re-fetch booking with full relations (since we only fetched host earlier for verification)
            const fullBooking = await prisma.booking.findUnique({
                where: { id: booking.id },
                include: { eventType: { include: { user: true, coHosts: true } }, host: true, contact: true },
            });

            if (!fullBooking) {
                console.error('[STRIPE_WEBHOOK] Booking lost while processing:', booking.id);
                return new Response('Booking not found', { status: 200 });
            }

            if (fullBooking.status === 'confirmed') {
                console.log('[STRIPE_WEBHOOK] Already confirmed:', booking.id);
                return new Response('Already processed', { status: 200 });
            }

            // Check for overbooking
            const conflict = await prisma.booking.findFirst({
                where: {
                    hostId: fullBooking.hostId,
                    status: 'confirmed',
                    id: { not: fullBooking.id },
                    OR: [
                        { AND: [{ startTime: { lte: fullBooking.startTime } }, { endTime: { gt: fullBooking.startTime } }] },
                        { AND: [{ startTime: { lt: fullBooking.endTime } }, { endTime: { gte: fullBooking.endTime } }] },
                    ],
                },
            });

            // Confirm booking
            const updatedBooking = await prisma.booking.update({
                where: { id: fullBooking.id },
                data: {
                    status: 'confirmed',
                    paymentStatus: 'paid',
                    ...(conflict && { notes: (fullBooking.notes || '') + `\n\n⚠️ OVERBOOKED: Slot taken by ${conflict.inviteeName} first.` }),
                },
                include: { eventType: { include: { user: true, coHosts: true } }, host: true, contact: true },
            });

            console.log('[STRIPE_WEBHOOK] Booking confirmed!');

            // Trigger workflows
            triggerWorkflows('EVENT_BOOKED', updatedBooking.id).catch(e => console.error('[STRIPE_WEBHOOK] Workflow error:', e));

            // Notifications
            const rawRecipients = [updatedBooking.eventType.user, ...(updatedBooking.eventType.coHosts || [])];
            const hostRecipients = Array.from(new Map(rawRecipients.map(r => [r.id, r])).values());

            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_confirmed',
                        title: conflict ? '⚠️ Overbooked Payment (Stripe)' : 'Payment Received (Stripe)',
                        message: conflict
                            ? `${updatedBooking.inviteeName} paid, but slot was taken!`
                            : `${updatedBooking.inviteeName} paid for "${updatedBooking.eventType.title}"`,
                        bookingId: updatedBooking.id,
                    },
                })
            ));

            // Google Calendar sync
            try {
                await createGoogleCalendarEvent({
                    title: `${updatedBooking.inviteeName} & ${updatedBooking.eventType.title}`,
                    description: `Paid via Stripe\n\nInvitee: ${updatedBooking.inviteeName}`,
                    location: updatedBooking.location || '',
                    startTime: updatedBooking.startTime,
                    endTime: updatedBooking.endTime,
                    attendeeEmail: updatedBooking.inviteeEmail,
                    userId: updatedBooking.hostId,
                });
            } catch (calErr) {
                console.log('[STRIPE_WEBHOOK] GCal sync skipped:', calErr.message);
            }

            // Emails
            const originBase = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`;
            const manageUrl = updatedBooking.manageToken ? `${originBase}/book/manage/${updatedBooking.manageToken}` : '';

            try {
                await sendBookingConfirmation({
                    booking: updatedBooking,
                    eventType: updatedBooking.eventType,
                    host: updatedBooking.host,
                    coHosts: hostRecipients.filter(r => r.id !== updatedBooking.hostId),
                    inviteeName: updatedBooking.inviteeName,
                    inviteeEmail: updatedBooking.inviteeEmail,
                    startTime: updatedBooking.startTime,
                    manageUrl,
                    timezone: updatedBooking.timezone,
                });
            } catch (emailErr) {
                console.error('[STRIPE_WEBHOOK] Email error:', emailErr.message);
            }
        }

        return new Response('Webhook processed', { status: 200 });
    } catch (error) {
        console.error('[STRIPE_WEBHOOK_ERROR]', error);
        return new Response('Webhook error', { status: 500 });
    }
}
