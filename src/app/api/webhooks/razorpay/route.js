import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { createGoogleCalendarEvent } from '@/lib/integrations/google';
import crypto from 'crypto';

export async function POST(request) {
    console.log('[RAZORPAY_WEBHOOK] Incoming webhook request...');
    try {
        const { searchParams } = new URL(request.url);
        const hostId = searchParams.get('hostId');

        if (!hostId) {
            console.error('[RAZORPAY_WEBHOOK] Error: Missing hostId in query parameters');
            return new Response('Missing hostId', { status: 400 });
        }

        // 1. Fetch host details
        const host = await prisma.user.findUnique({
            where: { id: hostId },
            select: { razorpayKeySecret: true, id: true, name: true, email: true }
        });

        if (!host || !host.razorpayKeySecret) {
            console.error('[RAZORPAY_WEBHOOK] Error: Host not found or Razorpay secret not configured for hostId:', hostId);
            return new Response('Host not configured', { status: 404 });
        }

        // 2. Decrypt host secret
        let webhookSecret;
        try {
            webhookSecret = decrypt(host.razorpayKeySecret);
        } catch (decErr) {
            console.error('[RAZORPAY_WEBHOOK] Error: Failed to decrypt host secret.');
            return new Response('Decryption failed', { status: 500 });
        }

        // 3. Get raw body and signature header
        const rawBody = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        if (!signature) {
            console.error('[RAZORPAY_WEBHOOK] Error: Missing x-razorpay-signature header');
            return new Response('Missing signature', { status: 400 });
        }

        // 4. Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error('[RAZORPAY_WEBHOOK] Error: Signature verification failed. Expected:', expectedSignature, 'Got:', signature);
            return new Response('Invalid signature', { status: 401 });
        }

        console.log('[RAZORPAY_WEBHOOK] Signature verified!');

        // 5. Parse body
        const body = JSON.parse(rawBody);
        const eventType = body.event;
        const payload = body.payload;

        // 6. Handle payment success
        if (eventType === 'order.paid' || eventType === 'payment.captured') {
            const orderId = payload.order?.entity?.id || payload.payment?.entity?.order_id;
            
            if (!orderId) {
                console.warn('[RAZORPAY_WEBHOOK] No orderId found in payload');
                return new Response('No orderId', { status: 200 });
            }

            console.log('[RAZORPAY_WEBHOOK] Processing payment for Order:', orderId);

            const booking = await prisma.booking.findFirst({
                where: { paymentSessionId: orderId },
                include: { eventType: { include: { user: true, coHosts: true } }, host: true, contact: true }
            });

            if (!booking) {
                console.error('[RAZORPAY_WEBHOOK] Booking not found for orderId:', orderId);
                return new Response('Booking not found', { status: 200 });
            }

            if (booking.status === 'confirmed') {
                console.log('[RAZORPAY_WEBHOOK] Booking already confirmed:', booking.id);
                return new Response('Already processed', { status: 200 });
            }

            // 7. Check for Overbooking (Collision)
            const conflict = await prisma.booking.findFirst({
                where: {
                    hostId: booking.hostId,
                    status: 'confirmed',
                    id: { not: booking.id },
                    OR: [
                        { AND: [{ startTime: { lte: booking.startTime } }, { endTime: { gt: booking.startTime } }] },
                        { AND: [{ startTime: { lt: booking.endTime } }, { endTime: { gte: booking.endTime } }] },
                    ],
                }
            });

            // 8. Update Booking status
            const updatedBooking = await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    status: 'confirmed',
                    paymentStatus: 'paid',
                    ...(conflict && { notes: (booking.notes || '') + `\n\n⚠️ OVERBOOKED: Slot taken by ${conflict.inviteeName} first.` })
                },
                include: { eventType: { include: { user: true, coHosts: true } }, host: true, contact: true }
            });

            console.log('[RAZORPAY_WEBHOOK] Success: Booking confirmed!');

            // 9. Finalize (Workflows, Notifications, Emails, GCal)
            
            // Trigger Workflows
            triggerWorkflows('EVENT_BOOKED', updatedBooking.id).catch(e => console.error('[RAZORPAY_WEBHOOK] Workflow error:', e));

            // Host recipients (Main + Co-hosts)
            const rawRecipients = [updatedBooking.eventType.user, ...(updatedBooking.eventType.coHosts || [])];
            const hostRecipients = Array.from(new Map(rawRecipients.map(r => [r.id, r])).values());

            // App Notifications
            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_confirmed',
                        title: conflict ? '⚠️ Overbooked Payment (Razorpay)' : 'Payment Received (Razorpay)',
                        message: conflict 
                            ? `${updatedBooking.inviteeName} paid, but slot was taken!`
                            : `${updatedBooking.inviteeName} paid ₹${updatedBooking.eventType.price}`,
                        bookingId: updatedBooking.id,
                    },
                })
            ));

            // Google Calendar Sync
            if (updatedBooking.eventType.locationType !== 'none') {
                try {
                    await createGoogleCalendarEvent({
                        title: `${updatedBooking.inviteeName} & ${updatedBooking.eventType.title}`,
                        description: `Paid via Razorpay\n\nInvitee: ${updatedBooking.inviteeName}`,
                        location: updatedBooking.location || '',
                        startTime: updatedBooking.startTime,
                        endTime: updatedBooking.endTime,
                        attendeeEmail: updatedBooking.inviteeEmail,
                        userId: hostId,
                    });
                } catch (calErr) {
                    console.log('[RAZORPAY_WEBHOOK] GCal sync skipped:', calErr.message);
                }
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
                console.error('[RAZORPAY_WEBHOOK] Email error:', emailErr.message);
            }
        }

        return new Response('Webhook processed', { status: 200 });
    } catch (error) {
        console.error('[RAZORPAY_WEBHOOK_ERROR]', error);
        return new Response('Webhook error', { status: 500 });
    }
}
