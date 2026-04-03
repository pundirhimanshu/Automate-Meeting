import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { sendBookingConfirmation } from '@/lib/email';
import { triggerWorkflows } from '@/lib/workflow-engine';
import { createZoomMeeting } from '@/lib/integrations/zoom';
import { createTeamsMeeting } from '@/lib/integrations/teams';
import { createGoogleMeetEvent, createGoogleCalendarEvent } from '@/lib/integrations/google';
import { canCreateBooking, canUseIntegration } from '@/lib/plans';
import { getUserSubscription } from '@/lib/subscription';
import { decrypt } from '@/lib/encryption';
import DodoPayments from 'dodopayments';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'upcoming';
        const search = searchParams.get('search') || '';
        const eventTypeId = searchParams.get('eventTypeId') || '';
        const now = new Date();

        let where = {};

        if (status === 'upcoming') {
            where = {
                OR: [
                    { hostId: session.user.id },
                    { eventType: { coHosts: { some: { id: session.user.id } } } }
                ],
                startTime: { gte: now },
                // Only show confirmed bookings or pending ones that don't require payment.
                // If it's pending AND requires payment, it's not actually a 'meeting' yet.
                OR: [
                    { status: 'confirmed' },
                    { 
                        AND: [
                            { status: 'pending' },
                            { eventType: { requiresPayment: false } }
                        ]
                    }
                ]
            };
        } else if (status === 'past') {
            where = {
                AND: [
                    {
                        OR: [
                            { hostId: session.user.id },
                            { eventType: { coHosts: { some: { id: session.user.id } } } }
                        ]
                    },
                    {
                        OR: [
                            { startTime: { lt: now } },
                            { status: 'completed' },
                        ]
                    }
                ]
            };
        } else if (status === 'cancelled') {
            where = {
                OR: [
                    { hostId: session.user.id },
                    { eventType: { coHosts: { some: { id: session.user.id } } } }
                ],
                status: 'cancelled',
            };
        } else if (status === 'rescheduled') {
            where = {
                OR: [
                    { hostId: session.user.id },
                    { eventType: { coHosts: { some: { id: session.user.id } } } }
                ],
                status: 'rescheduled',
            };
        } else if (status === 'single-use') {
            where = {
                OR: [
                    { hostId: session.user.id },
                    { eventType: { coHosts: { some: { id: session.user.id } } } }
                ],
                isSingleUse: true,
                // Only show confirmed or completed single-use bookings.
                status: { in: ['confirmed', 'completed', 'rescheduled'] }
            };
        }

        // Add search filter
        if (search) {
            where.OR = [
                ...(where.OR || []),
            ];
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { inviteeName: { contains: search, mode: 'insensitive' } },
                        { inviteeEmail: { contains: search, mode: 'insensitive' } },
                    ]
                }
            ];
        }

        // Add event type filter
        if (eventTypeId) {
            where.eventTypeId = eventTypeId;
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                eventType: { 
                    include: { 
                        customQuestions: { orderBy: { order: 'asc' } } 
                    } 
                },
                answers: true,
            },
            orderBy: { startTime: status === 'upcoming' ? 'asc' : 'desc' },
        });

        return NextResponse.json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}


export async function POST(request) {
    try {
        const body = await request.json();
        const {
            eventTypeId, inviteeName, inviteeEmail, startTime, endTime,
            timezone, notes, answers, inviteePhone, singleUseToken,
        } = body;

        if (!eventTypeId || !inviteeName || !inviteeEmail || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const eventType = await prisma.eventType.findUnique({
            where: { id: eventTypeId },
            include: { user: true, coHosts: true },
        });

        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        // Plan enforcement: check monthly booking limit
        const { plan: hostPlan } = await getUserSubscription(eventType.userId);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthlyBookings = await prisma.booking.count({
            where: {
                hostId: eventType.userId,
                createdAt: { gte: monthStart },
                status: { in: ['confirmed', 'pending'] },
            },
        });

        if (!canCreateBooking(monthlyBookings, hostPlan)) {
            return NextResponse.json({
                error: 'This host has reached their monthly booking limit. Please contact them to upgrade their plan.',
            }, { status: 403 });
        }

        // Plan enforcement: check integration access
        if ((eventType.locationType === 'zoom' || eventType.locationType === 'teams') && !canUseIntegration(eventType.locationType, hostPlan)) {
            return NextResponse.json({
                error: `${eventType.locationType.charAt(0).toUpperCase() + eventType.locationType.slice(1)} is not available on the ${hostPlan.charAt(0).toUpperCase() + hostPlan.slice(1)} plan. The host needs to upgrade.`,
            }, { status: 403 });
        }

        // Single-use link validation
        if (singleUseToken) {
            const link = await prisma.singleUseLink.findUnique({
                where: { token: singleUseToken }
            });

            if (!link || link.isUsed) {
                return NextResponse.json({
                    error: 'This Link is only for single use Link Go and try to Book other meeting'
                }, { status: 410 });
            }

            if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
                return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
            }
        }

        // Check for conflicts based on Event Type
        let conflict = false;
        let assignedHostId = eventType.userId;

        if (eventType.type === 'one-on-one' || eventType.type === 'collective') {
            // Collective: Check all hosts (owner + co-hosts)
            const hostIdsToDelta = [eventType.userId, ...eventType.coHosts.map(ch => ch.id)];

            const existingBookings = await prisma.booking.findMany({
                where: {
                    hostId: { in: hostIdsToDelta },
                    status: { in: ['confirmed', 'pending'] },
                    // If it's a paid event type, don't let 'pending' bookings (those at checkout) block the slot.
                    // Only 'confirmed' (paid) bookings will block the slot for paid event types.
                    ...(eventType.requiresPayment ? { status: 'confirmed' } : { status: { in: ['confirmed', 'pending'] } }),
                    OR: [
                        { AND: [{ startTime: { lte: new Date(startTime) } }, { endTime: { gt: new Date(startTime) } }] },
                        { AND: [{ startTime: { lt: new Date(endTime) } }, { endTime: { gte: new Date(endTime) } }] },
                    ],
                }
            });

            if (existingBookings.length > 0) {
                conflict = true;
            }
        } else if (eventType.type === 'group') {
            // Group: Check how many people already booked this specific slot
            const groupBookingsCount = await prisma.booking.count({
                where: {
                    eventTypeId: eventType.id,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    status: { in: ['confirmed', 'pending'] },
                    // If it's a paid event type, don't let 'pending' bookings (those at checkout) block the slot.
                    // Only 'confirmed' (paid) bookings will block the slot for paid event types.
                    ...(eventType.requiresPayment ? { status: 'confirmed' } : { status: { in: ['confirmed', 'pending'] } }),
                }
            });

            if (groupBookingsCount >= (eventType.inviteeLimit || 1)) {
                conflict = true;
            }
        } else if (eventType.type === 'round-robin') {
            // Round Robin: Find an available host from the pool
            const hostPool = [eventType.userId, ...eventType.coHosts.map(ch => ch.id)];
            const totalHosts = hostPool.length;

            // Try hosts starting from the one at roundRobinIndex
            const startIndex = eventType.roundRobinIndex % totalHosts;
            let foundHost = null;

            for (let i = 0; i < totalHosts; i++) {
                const checkIndex = (startIndex + i) % totalHosts;
                const candidateHostId = hostPool[checkIndex];

                const hostConflict = await prisma.booking.findFirst({
                    where: {
                        hostId: candidateHostId,
                        status: { in: ['confirmed', 'pending'] },
                    // If it's a paid event type, don't let 'pending' bookings (those at checkout) block the slot.
                    // Only 'confirmed' (paid) bookings will block the slot for paid event types.
                    ...(eventType.requiresPayment ? { status: 'confirmed' } : { status: { in: ['confirmed', 'pending'] } }),
                        OR: [
                            { AND: [{ startTime: { lte: new Date(startTime) } }, { endTime: { gt: new Date(startTime) } }] },
                            { AND: [{ startTime: { lt: new Date(endTime) } }, { endTime: { gte: new Date(endTime) } }] },
                        ],
                    }
                });

                if (!hostConflict) {
                    foundHost = candidateHostId;
                    break;
                }
            }

            if (foundHost) {
                assignedHostId = foundHost;
                // Update rotation index for next time
                await prisma.eventType.update({
                    where: { id: eventType.id },
                    data: { roundRobinIndex: { increment: 1 } }
                });
            } else {
                conflict = true;
            }
        }

        if (conflict) {
            return NextResponse.json({ error: 'Time slot is no longer available' }, { status: 409 });
        }

        // Check max bookings per day
        if (eventType.maxBookingsPerDay) {
            const dayStart = new Date(startTime);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(startTime);
            dayEnd.setHours(23, 59, 59, 999);

            const dayBookings = await prisma.booking.count({
                where: {
                    eventTypeId,
                    startTime: { gte: dayStart, lte: dayEnd },
                    status: { in: ['confirmed', 'pending'] },
                },
            });

            if (dayBookings >= eventType.maxBookingsPerDay) {
                return NextResponse.json({ error: 'Max bookings reached for this day' }, { status: 409 });
            }
        }

        // Generate dynamic meeting link if needed
        let meetingLink = eventType.location || '';
        if (eventType.locationType === 'phone') {
            if (eventType.phoneCallSource === 'invitee') {
                meetingLink = inviteePhone || 'Invitee forgot to provide phone';
            } else {
                // Host phone: combine countryCode and location
                meetingLink = `${eventType.countryCode || '+1'} ${eventType.location || ''}`.trim();
            }
        } else if (eventType.locationType === 'zoom') {
            try {
                meetingLink = await createZoomMeeting({
                    topic: `${inviteeName} & ${eventType.title}`,
                    startTime: new Date(startTime),
                    duration: eventType.duration,
                    userId: assignedHostId
                });
            } catch (zoomErr) {
                console.error('[BOOKING] Zoom meeting creation failed:', zoomErr.message);
                meetingLink = 'Zoom link unavailable — host has not connected Zoom';
            }
        } else if (eventType.locationType === 'teams') {
            try {
                meetingLink = await createTeamsMeeting({
                    subject: `${inviteeName} & ${eventType.title}`,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    userId: assignedHostId
                });
            } catch (teamsErr) {
                console.error('[BOOKING] Teams meeting creation failed:', teamsErr.message);
                meetingLink = 'Teams link unavailable — host has not connected Teams';
            }
        } else if (eventType.locationType === 'google_meet') {
            try {
                const result = await createGoogleMeetEvent({
                    title: `${inviteeName} & ${eventType.title}`,
                    description: `Booking via Scheduler\n\nInvitee: ${inviteeName}\nEmail: ${inviteeEmail}${notes ? '\nNotes: ' + notes : ''}`,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    attendeeEmail: inviteeEmail,
                    userId: assignedHostId,
                });
                meetingLink = result.meetLink || 'Google Meet link unavailable';
            } catch (googleErr) {
                console.error('[BOOKING] Google Meet creation failed:', googleErr.message);
                meetingLink = 'Google Meet link unavailable — host has not connected Google Calendar';
            }
        }

        // Optional: Sync to Google Calendar for non-Google Meet locations (like Zoom, Teams, Phone)
        if (eventType.locationType !== 'google_meet') {
            try {
                await createGoogleCalendarEvent({
                    title: `${inviteeName} & ${eventType.title}`,
                    description: `Booking via Scheduler\n\nInvitee: ${inviteeName}\nEmail: ${inviteeEmail}${notes ? '\nNotes: ' + notes : ''}\n\nLocation: ${meetingLink}`,
                    location: meetingLink,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    attendeeEmail: inviteeEmail,
                    userId: assignedHostId,
                });
            } catch (calErr) {
                // Ignore if not connected, it's fine. We only want to push it IF they happen to have Google Calendar connected.
                console.log('[BOOKING] Optional Google Calendar sync failed/skipped:', calErr.message);
            }
        }

           const bookingData = {
            eventTypeId,
            hostId: assignedHostId,
            inviteeName,
            inviteeEmail,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            timezone: timezone || 'UTC',
            notes: notes || '',
            location: meetingLink,
            status: eventType.requiresPayment ? 'pending' : 'confirmed',
            paymentStatus: eventType.requiresPayment ? 'pending' : 'none',
            answers: answers?.length ? {
                create: answers.map((a) => ({
                    questionId: a.questionId,
                    answer: a.answer,
                })),
            } : undefined,
            isSingleUse: !!singleUseToken,
        };

        let booking;
        if (singleUseToken) {
            const [newBooking] = await prisma.$transaction([
                prisma.booking.create({
                    data: bookingData,
                    include: { eventType: { select: { title: true, type: true, price: true, requiresPayment: true, user: true } }, host: true },
                }),
                prisma.singleUseLink.update({
                    where: { token: singleUseToken },
                    data: { isUsed: true },
                }),
            ]);
            booking = newBooking;
        } else {
            booking = await prisma.booking.create({
                data: bookingData,
                include: { eventType: { select: { title: true, type: true, price: true, requiresPayment: true, user: true } }, host: true },
            });
        }
        
        // Lead Capture: Automatically add/update the invitee as a contact for the host
        try {
            // Fetch question labels for better formatting in notes
            let customNotesString = '';
            if (answers && answers.length > 0) {
                const questions = await prisma.customQuestion.findMany({
                    where: { id: { in: answers.map(a => a.questionId) } }
                });
                const questionMap = questions.reduce((acc, q) => { 
                    acc[q.id] = q.question; 
                    return acc; 
                }, {});
                
                customNotesString = '\n\n--- Custom Questions ---\n' + answers.map(a => {
                    const label = questionMap[a.questionId] || 'Question';
                    return `${label}: ${a.answer}`;
                }).join('\n');
            }

            const mergedNotes = `Meeting: ${booking.eventType.title}${notes ? '\n\nNotes from Invitee: ' + notes : ''}${customNotesString}`;

            const existingContact = await prisma.contact.findUnique({
                where: {
                    userId_email: {
                        userId: assignedHostId,
                        email: inviteeEmail,
                    }
                }
            });

            // If a different name is used for an existing contact, log it in the notes but keep the original name
            let finalNotes = mergedNotes;
            if (existingContact && existingContact.name !== inviteeName) {
                finalNotes = `(Alternate Name used: ${inviteeName})\n` + mergedNotes;
            }

            await prisma.contact.upsert({
                where: {
                    userId_email: {
                        userId: assignedHostId,
                        email: inviteeEmail,
                    }
                },
                update: {
                    notes: (existingContact?.notes || '') + '\n\n' + finalNotes,
                    updatedAt: new Date(),
                },
                create: {
                    name: inviteeName,
                    email: inviteeEmail,
                    userId: assignedHostId,
                    notes: finalNotes,
                }
            });
            console.log('[BOOKING] Contact captured/updated with custom answers for host:', assignedHostId);
        } catch (contactErr) {
            console.error('[BOOKING] Contact capture failed:', contactErr.message);
        }

        // Handle Payment Flow if required
        let checkoutUrl = null;
        if (eventType.requiresPayment) {
            const hostUser = eventType.user;
            if (!hostUser.dodoApiKey || !hostUser.dodoWebhookSecret) {
                // Cleanup the pending booking if host is not ready
                await prisma.booking.delete({ where: { id: booking.id } });
                return NextResponse.json({ 
                    error: 'This host has not yet set up their payment integration. Please contact them.' 
                }, { status: 400 });
            }

            try {
                const apiKey = decrypt(hostUser.dodoApiKey);
                
                // Initialize Dodo client
                const dodo = new DodoPayments({ 
                    bearerToken: apiKey,
                });

                // Create Dodo Checkout Session using SDK
                const session = await dodo.checkoutSessions.create({
                    customer: {
                        name: inviteeName,
                        email: inviteeEmail,
                    },
                    product_cart: [{
                        product_id: eventType.dodoProductId, // Use the real Product ID from the database
                        quantity: 1,
                    }],
                    billing_currency: 'INR',
                    metadata: {
                        bookingId: booking.id,
                        hostId: assignedHostId,
                    },
                    return_url: `${request.headers.get('origin') || process.env.NEXTAUTH_URL || ''}/book/confirmed?bookingId=${booking.id}`,
                });

                checkoutUrl = session.checkout_url;
                
                // Save the session ID in the booking
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { paymentSessionId: session.checkout_session_id }
                });
            } catch (err) {
                console.error('[DODO_INIT_ERROR]', err);
                await prisma.booking.delete({ where: { id: booking.id } });
                return NextResponse.json({ 
                    error: `Payment initialization critical error: ${err.message}` 
                }, { status: 500 });
            }
        }

        // --- Notification & Email Logic ---
        let hostRecipients = [];
        if (eventType.type === 'round-robin' || eventType.type === 'collective' || eventType.type === 'group') {
            const rawRecipients = [eventType.user, ...eventType.coHosts];
            hostRecipients = Array.from(new Map(rawRecipients.map(r => [r.id, r])).values());
        } else {
            hostRecipients = [eventType.user];
        }

        // ONLY trigger notifications/workflows/emails for non-paid meetings here.
        // Paid meetings will trigger these in the WEBHOOK after payment is confirmed.
        if (!eventType.requiresPayment) {
            // Trigger Workflows (Non-blocking)
            triggerWorkflows('EVENT_BOOKED', booking.id).catch(e => console.error('Workflow trigger error:', e));

            // Create in-app notifications
            await Promise.all(hostRecipients.map(recipient =>
                prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: 'booking_confirmed',
                        title: 'New Booking',
                        message: eventType.type === 'collective'
                            ? `${inviteeName} booked "${eventType.title}" with the team`
                            : `${inviteeName} booked "${eventType.title}"`,
                        bookingId: booking.id,
                    },
                })
            ));

            // Generate manage URL for invitee self-service
            const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
            const manageUrl = booking.manageToken ? `${origin}/book/manage/${booking.manageToken}` : '';

            // Send confirmation emails
            await sendBookingConfirmation({
                booking,
                eventType,
                host: booking.host, 
                coHosts: hostRecipients.filter(r => r.id !== booking.hostId), 
                inviteeName,
                inviteeEmail,
                startTime,
                manageUrl,
                timezone: timezone || 'UTC',
            });
        }

        return NextResponse.json({ 
            booking, 
            checkoutUrl 
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
