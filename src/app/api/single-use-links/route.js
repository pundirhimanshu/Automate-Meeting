import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const eventTypeId = searchParams.get('eventTypeId');

        const where = { userId: session.user.id };
        if (eventTypeId) where.eventTypeId = eventTypeId;

        const links = await prisma.singleUseLink.findMany({
            where,
            include: {
                eventType: { select: { title: true, color: true, duration: true, type: true, location: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ links });
    } catch (error) {
        console.error('Error fetching single-use links:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { eventTypeId, contactName, contactEmail } = body;

        if (!eventTypeId) {
            return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
        }

        // Verify ownership
        const eventType = await prisma.eventType.findFirst({
            where: { id: eventTypeId, userId: session.user.id },
        });

        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        const link = await prisma.singleUseLink.create({
            data: {
                eventTypeId,
                userId: session.user.id,
                contactName: contactName || null,
                contactEmail: contactEmail || null,
            },
            include: {
                eventType: { select: { title: true, color: true, duration: true, type: true, location: true } },
            },
        });

        return NextResponse.json({ link }, { status: 201 });
    } catch (error) {
        console.error('Error creating single-use link:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
