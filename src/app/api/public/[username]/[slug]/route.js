import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { username, slug } = params;

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                schedules: {
                    where: { isDefault: true },
                    include: {
                        availabilities: { orderBy: { dayOfWeek: 'asc' } },
                        dateOverrides: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const eventType = await prisma.eventType.findFirst({
            where: { userId: user.id, slug, isActive: true },
            include: {
                customQuestions: { orderBy: { order: 'asc' } },
                coHosts: { select: { id: true, name: true, email: true, username: true, logo: true } }
            },
        });

        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        // Get bookings from the start of TODAY to correctly calculate daily limits
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        const hostIds = [user.id, ...(eventType.coHosts?.map(ch => ch.id) || [])];

        const existingBookings = await prisma.booking.findMany({
            where: {
                hostId: { in: hostIds },
                startTime: { gte: startOfToday },
                status: { in: ['confirmed', 'pending', 'rescheduled'] },
            },
            select: { id: true, startTime: true, endTime: true, hostId: true, eventTypeId: true },
        });

        const schedule = user.schedules[0] || null;

        return NextResponse.json({
            host: {
                id: user.id,
                name: user.name,
                username: user.username,
                timezone: user.timezone,
                brandColor: user.brandColor,
                logo: user.logo,
            },
            eventType: {
                id: eventType.id,
                title: eventType.title,
                description: eventType.description,
                duration: eventType.duration,
                type: eventType.type,
                color: eventType.color,
                locationType: eventType.locationType,
                location: eventType.location,
                countryCode: eventType.countryCode,
                phoneCallSource: eventType.phoneCallSource,
                bufferTimeBefore: eventType.bufferTimeBefore,
                bufferTimeAfter: eventType.bufferTimeAfter,
                minNotice: eventType.minNotice,
                maxBookingsPerDay: eventType.maxBookingsPerDay,
                dateRangeType: eventType.dateRangeType,
                dateRangeDays: eventType.dateRangeDays,
                customQuestions: eventType.customQuestions,
                requiresPayment: eventType.requiresPayment,
                price: eventType.price,
                currency: eventType.currency,
                paymentProvider: eventType.paymentProvider,
                inviteeLimit: eventType.inviteeLimit,
                coHosts: eventType.coHosts,
            },
            availability: schedule ? schedule.availabilities : [],
            dateOverrides: schedule ? schedule.dateOverrides : [],
            existingBookings: existingBookings,
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
