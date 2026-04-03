import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { createGoogleCalendarEvent } from '@/lib/integrations/google';
import DodoPayments from 'dodopayments';

export async function POST(request) {
    console.log('[DODO_WEBHOOK] Incoming webhook request...');
    try {
        const { searchParams } = new URL(request.url);
        const hostId = searchParams.get('hostId');

        if (!hostId) {
            console.error('[DODO_WEBHOOK] Error: Missing hostId in query parameters');
            return new Response('Missing hostId', { status: 400 });
        }

        // 1. Fetch host details
        const host = await prisma.user.findUnique({
            where: { id: hostId },
            select: { dodoWebhookSecret: true, id: true, name: true, email: true }
        });

        if (!host || !host.dodoWebhookSecret) {
            console.error('[DODO_WEBHOOK] Error: Host not found or Dodo secret not configured for hostId:', hostId);
            return new Response('Host not configured', { status: 404 });
        }

        console.log('[DODO_WEBHOOK] Found host and secret. Proceeding to verify signature...');

        // 2. Decrypt host secret
        let webhookSecret;
        try {
            webhookSecret = decrypt(host.dodoWebhookSecret);
        } catch (decErr) {
            console.error('[DODO_WEBHOOK] Error: Failed to decrypt host secret. ENCRYPTION_KEY might be invalid.');
            return new Response('Decryption failed', { status: 500 });
        }

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
            
            // Dodo SDK v2 might use .type or .event_type depending on version/payload
            const eventType = event.type || event.event_type;
            console.log('[DODO_WEBHOOK] Signature verified! Event Type:', eventType);

            // 5. Handle success events (Checkout Completion or Payment Success)
            const successEvents = ['checkout.session.completed', 'payment.succeeded', 'order.completed'];
            
            if (successEvents.includes(eventType)) {
                // Metadata can be in event.data.metadata or top-level event.metadata
                const metadata = event.data?.metadata || event.metadata || {};
                const bookingId = metadata.bookingId;

                console.log('[DODO_WEBHOOK] Processing success event. Metadata:', JSON.stringify(metadata));

                if (!bookingId) {
                    console.warn('[DODO_WEBHOOK] Warn: No bookingId found in event metadata. Available keys:', Object.keys(metadata));
                    return new Response('Missing bookingId', { status: 200 }); 
                }

                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { eventType: true, host: true }
                });

                if (!booking) {
                    console.error('[DODO_WEBHOOK] Error: Booking not found in database for ID:', bookingId);
                    return new Response('Booking not found', { status: 200 });
                }

                if (booking.status === 'confirmed') {
                    console.log('[DODO_WEBHOOK] Booking is already confirmed, skipping redundant processing for ID:', bookingId);
                    return new Response('Already processed', { status: 200 });
                }

                // 6. Check for Overbooking (Collision)
                // Since we allow 'racing' for paid slots, someone else might have paid for this slot 
                // while this user was at the checkout page.
                const conflict = await prisma.booking.findFirst({
                    where: {
                        hostId: booking.hostId,
                        status: 'confirmed',
                        id: { not: bookingId }, // Not this one
                        OR: [
                            { AND: [{ startTime: { lte: booking.startTime } }, { endTime: { gt: booking.startTime } }] },
                            { AND: [{ startTime: { lt: booking.endTime } }, { endTime: { gte: booking.endTime } }] },
                        ],
                    }
                });

                if (conflict) {
                    console.warn(`[DODO_WEBHOOK] OVERBOOKING DETECTED! Booking ${bookingId} was paid for, but the slot was already taken by ${conflict.id}.`);
                    // We still confirm it because they paid, but we should notify the host.
                }

                // 7. Update Booking status
                const updatedBooking = await prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: 'confirmed',
                        paymentStatus: 'paid',
                        // Store conflict info in notes if it happened
                        ...(conflict && { notes: (booking.notes || '') + `\n\n⚠️ OVERBOOKED: Slot taken by ${conflict.inviteeName} first.` })
                    },
                    include: { eventType: true, host: true }
                });

                console.log('[DODO_WEBHOOK] Success: Booking marked as PAID and CONFIRMED in database.');

                // 8. Finalize Booking (Emails, Workflows, Sync)
                
                // Trigger Workflows
                console.log('[DODO_WEBHOOK] Triggering workflows for EVENT_BOOKED...');
                triggerWorkflows('EVENT_BOOKED', updatedBooking.id).catch(e => console.error('[DODO_WEBHOOK] Workflow trigger error:', e));

                // Create in-app notification for host
                await prisma.notification.create({
                    data: {
                        userId: hostId,
                        type: 'booking_confirmed',
                        title: conflict ? '⚠️ Overbooked Payment' : 'Payment Received',
                        message: conflict 
                            ? `${updatedBooking.inviteeName} paid, but the slot was already taken! Check details.`
                            : `${updatedBooking.inviteeName} paid for "${updatedBooking.eventType.title}"`,
                        bookingId: updatedBooking.id,
                    },
                });

                // Update/Create Contact to reflect payment status
                try {
                    const existingContact = await prisma.contact.findUnique({
                        where: { userId_email: { userId: hostId, email: updatedBooking.inviteeEmail } }
                    });

                    await prisma.contact.upsert({
                        where: { userId_email: { userId: hostId, email: updatedBooking.inviteeEmail } },
                        update: {
                            notes: (existingContact?.notes || '') + `\n[PAID] ${updatedBooking.eventType.title}`,
                            updatedAt: new Date(),
                        },
                        create: {
                            name: updatedBooking.inviteeName,
                            email: updatedBooking.inviteeEmail,
                            userId: hostId,
                            notes: `Paid Booking: ${updatedBooking.eventType.title}`,
                        }
                    });
                    console.log('[DODO_WEBHOOK] Contact updated for successful payment.');
                } catch (contactErr) {
                    console.error('[DODO_WEBHOOK] Contact update failed:', contactErr.message);
                }

                // Google Calendar Sync
                if (updatedBooking.eventType.locationType !== 'none') {
                    console.log('[DODO_WEBHOOK] Syncing to Google Calendar...');
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
                        console.log('[DODO_WEBHOOK] Google Calendar sync skipped/failed:', calErr.message);
                    }
                }

                // Send confirmation emails
                console.log('[DODO_WEBHOOK] Sending confirmation emails to host and invitee...');
                
                // Robust origin detection: Prioritize public URLs
                const protocol = request.headers.get('x-forwarded-proto') || 'https';
                const hostHeader = request.headers.get('host') || 'localhost:3000';
                const originBase = `${protocol}://${hostHeader}`;
                const manageUrl = updatedBooking.manageToken ? `${originBase}/book/manage/${updatedBooking.manageToken}` : '';

                try {
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
                    console.log('[DODO_WEBHOOK] Emails sent successfully!');
                } catch (emailErr) {
                    console.error('[DODO_WEBHOOK] CRITICAL: Failed to send confirmation emails:', emailErr.message);
                }
            } else {
                console.log('[DODO_WEBHOOK] ignoring irrelevant event type:', eventType);
            }
        } catch (err) {
            console.error('[DODO_WEBHOOK] Error: Signature verification failed:', err.message);
            return new Response('Invalid signature', { status: 401 });
        }

        return new Response('Webhook processed', { status: 200 });
    } catch (error) {
        console.error('[DODO_WEBHOOK_ERROR] Unhandled exception:', error);
        return new Response('Webhook error', { status: 500 });
    }
}
