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
            include: { customQuestions: { orderBy: { order: 'asc' } } },
        });

        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        // Get existing bookings for conflict checking
        const now = new Date();
        const futureBookings = await prisma.booking.findMany({
            where: {
                hostId: user.id,
                startTime: { gte: now },
                status: { in: ['confirmed', 'pending'] },
            },
            select: { startTime: true, endTime: true },
        });

        const schedule = user.schedules[0] || null;

        return NextResponse.json({
            host: {
                name: user.name,
                username: user.username,
                timezone: user.timezone,
                brandColor: user.brandColor,
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
            },
            availability: schedule ? schedule.availabilities : [],
            dateOverrides: schedule ? schedule.dateOverrides : [],
            existingBookings: futureBookings,
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
