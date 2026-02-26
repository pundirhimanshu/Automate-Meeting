import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Total bookings
        const totalBookings = await prisma.booking.count({
            where: { hostId: userId },
        });

        // Bookings this month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthBookings = await prisma.booking.count({
            where: { hostId: userId, createdAt: { gte: monthStart } },
        });

        // Confirmed bookings
        const confirmedBookings = await prisma.booking.count({
            where: { hostId: userId, status: 'confirmed' },
        });

        // Cancelled bookings
        const cancelledBookings = await prisma.booking.count({
            where: { hostId: userId, status: 'cancelled' },
        });

        // Completed bookings
        const completedBookings = await prisma.booking.count({
            where: { hostId: userId, status: 'completed' },
        });

        // Upcoming bookings
        const upcomingBookings = await prisma.booking.count({
            where: {
                hostId: userId,
                startTime: { gte: now },
                status: { in: ['confirmed', 'pending'] },
            },
        });

        // Calculate conversion rate (confirmed / total)
        const conversionRate = totalBookings > 0 ? ((confirmedBookings + completedBookings) / totalBookings * 100).toFixed(1) : 0;

        // No-show rate (simple: cancelled / total)
        const noShowRate = totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(1) : 0;

        // Popular time slots
        const bookings = await prisma.booking.findMany({
            where: { hostId: userId, createdAt: { gte: thirtyDaysAgo } },
            select: { startTime: true },
        });

        const hourCounts = {};
        bookings.forEach((b) => {
            const hour = new Date(b.startTime).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const popularSlots = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count);

        // Bookings per day for last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await prisma.booking.count({
                where: {
                    hostId: userId,
                    createdAt: { gte: date, lt: nextDate },
                },
            });

            last7Days.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en', { weekday: 'short' }),
                count,
            });
        }

        // Event type breakdown
        const eventTypes = await prisma.eventType.findMany({
            where: { userId },
            include: { _count: { select: { bookings: true } } },
        });

        const eventBreakdown = eventTypes.map((et) => ({
            name: et.title,
            bookings: et._count.bookings,
            color: et.color,
        }));

        return NextResponse.json({
            totalBookings,
            monthBookings,
            upcomingBookings,
            confirmedBookings,
            cancelledBookings,
            completedBookings,
            conversionRate: parseFloat(conversionRate),
            noShowRate: parseFloat(noShowRate),
            popularSlots,
            last7Days,
            eventBreakdown,
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
