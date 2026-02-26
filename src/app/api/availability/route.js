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

        const schedules = await prisma.schedule.findMany({
            where: { userId: session.user.id },
            include: {
                availabilities: { orderBy: { dayOfWeek: 'asc' } },
                dateOverrides: { orderBy: { date: 'asc' } },
            },
        });

        return NextResponse.json({ schedules });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { scheduleId, availabilities, dateOverrides } = body;

        if (!scheduleId) {
            return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
        }

        // Verify ownership
        const schedule = await prisma.schedule.findFirst({
            where: { id: scheduleId, userId: session.user.id },
        });

        if (!schedule) {
            return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Update availabilities
        if (availabilities !== undefined) {
            await prisma.availability.deleteMany({ where: { scheduleId } });
            if (availabilities.length > 0) {
                await prisma.availability.createMany({
                    data: availabilities.map((a) => ({
                        scheduleId,
                        dayOfWeek: a.dayOfWeek,
                        startTime: a.startTime,
                        endTime: a.endTime,
                    })),
                });
            }
        }

        // Update date overrides
        if (dateOverrides !== undefined) {
            await prisma.dateOverride.deleteMany({ where: { scheduleId } });
            if (dateOverrides.length > 0) {
                await prisma.dateOverride.createMany({
                    data: dateOverrides.map((d) => ({
                        scheduleId,
                        date: new Date(d.date),
                        startTime: d.startTime || null,
                        endTime: d.endTime || null,
                        isBlocked: d.isBlocked || false,
                    })),
                });
            }
        }

        const updated = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            include: {
                availabilities: { orderBy: { dayOfWeek: 'asc' } },
                dateOverrides: { orderBy: { date: 'asc' } },
            },
        });

        return NextResponse.json({ schedule: updated });
    } catch (error) {
        console.error('Error updating availability:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
