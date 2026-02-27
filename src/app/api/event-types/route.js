import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const eventTypes = await prisma.eventType.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { bookings: true } },
                coHosts: { select: { id: true, name: true, email: true } }
            },
        });

        return NextResponse.json({ eventTypes });
    } catch (error) {
        console.error('Error fetching event types:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title, slug, description, duration, type, color,
            locationType, location, bufferTimeBefore, bufferTimeAfter,
            dateRangeType, dateRangeDays, dateRangeStart, dateRangeEnd,
            maxBookingsPerDay, minNotice, requiresPayment, price, currency,
            customQuestions,
        } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const eventSlug = slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

        // Check if slug exists for user
        let finalSlug = eventSlug;
        let counter = 1;
        while (await prisma.eventType.findUnique({ where: { userId_slug: { userId: session.user.id, slug: finalSlug } } })) {
            finalSlug = `${eventSlug}-${counter}`;
            counter++;
        }

        const eventType = await prisma.eventType.create({
            data: {
                title,
                slug: finalSlug,
                description: description || '',
                duration: duration || 30,
                type: type || 'one-on-one',
                color: color || '#ff9500',
                locationType: locationType || 'none',
                location: location || '',
                bufferTimeBefore: bufferTimeBefore || 0,
                bufferTimeAfter: bufferTimeAfter || 0,
                dateRangeType: dateRangeType || 'indefinite',
                dateRangeDays: dateRangeDays || null,
                dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : null,
                dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : null,
                maxBookingsPerDay: maxBookingsPerDay || null,
                minNotice: minNotice || 60,
                requiresPayment: requiresPayment || false,
                price: price || null,
                currency: currency || 'USD',
                userId: session.user.id,
                coHosts: body.coHostIds?.length ? {
                    connect: body.coHostIds.map(id => ({ id }))
                } : undefined,
                customQuestions: customQuestions?.length ? {
                    create: customQuestions.map((q, i) => ({
                        question: q.question,
                        type: q.type || 'text',
                        required: q.required || false,
                        options: q.options || null,
                        order: i,
                    })),
                } : undefined,
            },
        });

        return NextResponse.json({ eventType }, { status: 201 });
    } catch (error) {
        console.error('Error creating event type:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
