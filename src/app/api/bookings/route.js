import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { sendBookingConfirmation } from '@/lib/email';
import { createZoomMeeting } from '@/lib/integrations/zoom';
import { createTeamsMeeting } from '@/lib/integrations/teams';

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
                status: { in: ['confirmed', 'pending'] },
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
                eventType: { select: { title: true, duration: true, color: true, type: true } },
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
            timezone, notes, answers, inviteePhone,
        } = body;

        if (!eventTypeId || !inviteeName || !inviteeEmail || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const eventType = await prisma.eventType.findUnique({
            where: { id: eventTypeId },
            include: { user: true },
        });

        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        // Check for conflicts
        const conflict = await prisma.booking.findFirst({
            where: {
                hostId: eventType.userId,
                status: { in: ['confirmed', 'pending'] },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: new Date(startTime) } },
                            { endTime: { gt: new Date(startTime) } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: new Date(endTime) } },
                            { endTime: { gte: new Date(endTime) } },
                        ],
                    },
                ],
            },
        });

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
                    userId: eventType.userId
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
                    userId: eventType.userId
                });
            } catch (teamsErr) {
                console.error('[BOOKING] Teams meeting creation failed:', teamsErr.message);
                meetingLink = 'Teams link unavailable — host has not connected Teams';
            }
        }


        const booking = await prisma.booking.create({
            data: {
                eventTypeId,
                hostId: eventType.userId,
                inviteeName,
                inviteeEmail,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                timezone: timezone || 'UTC',
                notes: notes || '',
                location: meetingLink,
                status: 'confirmed',
                answers: answers?.length ? {
                    create: answers.map((a) => ({
                        questionId: a.questionId,
                        answer: a.answer,
                    })),
                } : undefined,
            },
            include: {
                eventType: { select: { title: true } },
            },
        });

        // Create notification for host
        await prisma.notification.create({
            data: {
                userId: eventType.userId,
                type: 'booking_confirmed',
                title: 'New Booking',
                message: `${inviteeName} booked "${eventType.title}" for ${new Date(startTime).toLocaleDateString()}`,
                bookingId: booking.id,
            },
        });

        // Send confirmation emails
        await sendBookingConfirmation({
            booking,
            eventType,
            host: eventType.user,
            inviteeName,
            inviteeEmail,
            startTime,
        });

        return NextResponse.json({ booking }, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
