import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { token } = params;

        const link = await prisma.singleUseLink.findUnique({
            where: { token },
            include: {
                eventType: {
                    include: {
                        user: {
                            select: { id: true, name: true, username: true, brandColor: true, timezone: true },
                        },
                        customQuestions: { orderBy: { order: 'asc' } },
                    },
                },
            },
        });

        if (!link) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        if (link.isUsed) {
            return NextResponse.json({ error: 'This link has already been used' }, { status: 410 });
        }

        if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
            return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
        }

        if (!link.eventType.isActive) {
            return NextResponse.json({ error: 'This event type is no longer active' }, { status: 410 });
        }

        // Fetch host availability & existing bookings (same as public booking page)
        const schedule = await prisma.schedule.findFirst({
            where: { userId: link.eventType.userId, isDefault: true },
            include: {
                availabilities: true,
                dateOverrides: true,
            },
        });

        const existingBookings = await prisma.booking.findMany({
            where: {
                hostId: link.eventType.userId,
                status: { in: ['confirmed', 'pending'] },
                startTime: { gte: new Date() },
            },
            select: { startTime: true, endTime: true },
        });

        return NextResponse.json({
            eventType: link.eventType,
            host: link.eventType.user,
            availability: schedule?.availabilities || [],
            dateOverrides: schedule?.dateOverrides || [],
            existingBookings,
            prefill: {
                name: link.contactName || '',
                email: link.contactEmail || '',
            },
            singleUseToken: link.token,
        });
    } catch (error) {
        console.error('Error fetching single-use link:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
