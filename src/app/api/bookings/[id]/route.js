import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendBookingCancellation, sendBookingReschedule, sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { triggerWebhook } from '@/lib/webhook-dispatcher';
import { decrypt } from '@/lib/encryption';
import DodoPayments from 'dodopayments';
import Razorpay from 'razorpay';

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
                        paymentProvider: true,
                        user: { select: { id: true, name: true, avatar: true, logo: true, brandColor: true } }
                    }
                }
            }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // --- Double-check Payment status if still pending ---
        if (booking.status === 'pending' && booking.paymentSessionId) {
            const provider = booking.eventType.paymentProvider || 'dodo';
            
            try {
                let isPaid = false;

                // 1. DODO VERIFICATION
                if (provider === 'dodo' && booking.host.dodoApiKey) {
                    const dodoApiKey = decrypt(booking.host.dodoApiKey);
                    const dodo = new DodoPayments({ bearerToken: dodoApiKey });
                    const session = await dodo.checkoutSessions.retrieve(booking.paymentSessionId);
                    isPaid = session.payment_status === 'succeeded' || session.status === 'completed' || session.status === 'paid';
                } 
                
                // 2. RAZORPAY VERIFICATION
                else if (provider === 'razorpay' && booking.host.razorpayKeyId && booking.host.razorpayKeySecret) {
                    const keyId = decrypt(booking.host.razorpayKeyId);
                    const keySecret = decrypt(booking.host.razorpayKeySecret);
                    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
                    
                    const order = await razorpay.orders.fetch(booking.paymentSessionId);
                    isPaid = order.status === 'paid';
                }
                
                // 3. STRIPE VERIFICATION
                else if (provider === 'stripe' && (booking.host.stripeAccountId || booking.host.stripeSecretKey)) {
                    const Stripe = require('stripe');
                    let stripe;
                    
                    if (booking.host.stripeAccountId) {
                        const platformKey = process.env.STRIPE_SECRET_KEY;
                        if (!platformKey) throw new Error('Platform Stripe key missing in environment');
                        stripe = new Stripe(platformKey);
                    } else {
                        const userSecretKey = decrypt(booking.host.stripeSecretKey);
                        stripe = new Stripe(userSecretKey);
                    }
                    
                    const session = await stripe.checkout.sessions.retrieve(booking.paymentSessionId);
                    isPaid = session.payment_status === 'paid';
                }

                if (isPaid) {
                    console.log(`[BOOKING_VERIFY] Payment confirmed via API for ${booking.id}. Updating status.`);
                    
                    const updatedBooking = await prisma.booking.update({
                        where: { id: booking.id },
                        data: { status: 'confirmed', paymentStatus: 'paid' },
                        include: { 
                            eventType: { include: { user: true, coHosts: true, customQuestions: true } }, 
                            host: true,
                            answers: true 
                        }
                    });

                    // Finalize (Workflows, Emails)
                    triggerWorkflows('EVENT_BOOKED', updatedBooking.id).catch(console.error);
                    
                    const origin = request.headers.get('origin') || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`;
                    const manageUrl = updatedBooking.manageToken ? `${origin}/book/manage/${updatedBooking.manageToken}` : '';

                    const rawRecipients = [updatedBooking.eventType.user, ...(updatedBooking.eventType.coHosts || [])];
                    const hostRecipients = Array.from(new Map(rawRecipients.map(r => [r.id, r])).values());

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

                    // Trigger Pabbly / Global Webhook
                    triggerWebhook(updatedBooking.hostId, 'booking.confirmed', {
                        bookingId: updatedBooking.id,
                        eventTitle: updatedBooking.eventType.title,
                        inviteeName: updatedBooking.inviteeName,
                        inviteeEmail: updatedBooking.inviteeEmail,
                        startTime: updatedBooking.startTime,
                        endTime: updatedBooking.endTime,
                        location: updatedBooking.location,
                        timezone: updatedBooking.timezone,
                        notes: updatedBooking.notes,
                        status: 'confirmed',
                        cancel_reason: '',
                        // CRM Friendly Fields
                        first_name: updatedBooking.inviteeName.split(' ')[0] || updatedBooking.inviteeName,
                        last_name: updatedBooking.inviteeName.split(' ').slice(1).join(' ') || '.', // Default to '.' for CRMs that require a Last Name
                        phone: (() => {
                            const answers = updatedBooking.answers || [];
                            const phoneAnswer = answers.find(a => {
                                const qText = updatedBooking.eventType.customQuestions?.find(cq => cq.id === a.questionId)?.question?.toLowerCase() || '';
                                return qText.includes('phone') || qText.includes('contact') || qText.includes('mobile') || a.answer.match(/^\+?[\d\s-]{10,}$/);
                            });
                            return phoneAnswer?.answer || '';
                        })(),
                        price: updatedBooking.eventType.price || 0,
                        currency: updatedBooking.eventType.currency || 'USD',
                        event_title: updatedBooking.eventType.title,
                        invitee_name: updatedBooking.inviteeName,
                        invitee_email: updatedBooking.inviteeEmail,
                        booking_id: updatedBooking.id,
                        start_time: updatedBooking.startTime,
                        end_time: updatedBooking.endTime,
                        host_name: updatedBooking.host.name,
                        host_email: updatedBooking.host.email,
                        host_id: updatedBooking.hostId
                    }, { eventTypeId: updatedBooking.eventTypeId }).catch(e => console.error('Webhook trigger error:', e));

                    return NextResponse.json({ booking: updatedBooking });
                }
            } catch (err) {
                console.error('[BOOKING_VERIFY_ERROR]', err.message);
            }
        } else if (booking.status === 'pending' && !booking.paymentSessionId) {
            console.warn(`[BOOKING_VERIFY] Booking ${booking.id} is pending but has NO paymentSessionId saved!`);
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

            // Trigger Webhook
            triggerWebhook(booking.hostId, 'booking.cancelled', {
                bookingId: booking.id,
                eventTitle: booking.eventType.title,
                inviteeName: booking.inviteeName,
                inviteeEmail: booking.inviteeEmail,
                startTime: booking.startTime,
                endTime: booking.endTime,
                cancelReason: cancelReason || '',
                cancel_reason: cancelReason || '', // Added for snake_case compatibility
                timezone: booking.timezone,
                status: 'cancelled'
            }, { eventTypeId: booking.eventTypeId }).catch(e => console.error('Webhook trigger error:', e));

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

            return NextResponse.json({ message: 'Booking rescheduled' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
