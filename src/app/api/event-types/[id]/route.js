import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const eventType = await prisma.eventType.findFirst({
            where: { id: params.id, userId: session.user.id },
            include: {
                customQuestions: { orderBy: { order: 'asc' } },
                coHosts: { select: { id: true, name: true, email: true } }
            },
        });

        if (!eventType) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ eventType });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title, description, duration, type, color, locationType, location, phoneCallSource,
            bufferTimeBefore, bufferTimeAfter, dateRangeType,
            dateRangeDays, maxBookingsPerDay, minNotice, isActive,
            isSingleUse, requiresPayment, price, customQuestions,
        } = body;

        // Update event type
        const eventType = await prisma.eventType.update({
            where: { id: params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(duration !== undefined && { duration }),
                ...(type !== undefined && { type }),
                ...(color !== undefined && { color }),
                ...(locationType !== undefined && { locationType }),
                ...(location !== undefined && { location }),
                ...(phoneCallSource !== undefined && { phoneCallSource }),
                ...(bufferTimeBefore !== undefined && { bufferTimeBefore }),
                ...(bufferTimeAfter !== undefined && { bufferTimeAfter }),
                ...(dateRangeType !== undefined && { dateRangeType }),
                ...(dateRangeDays !== undefined && { dateRangeDays }),
                ...(maxBookingsPerDay !== undefined && { maxBookingsPerDay }),
                ...(minNotice !== undefined && { minNotice }),
                ...(isActive !== undefined && { isActive }),
                ...(isSingleUse !== undefined && { isSingleUse }),
                ...(requiresPayment !== undefined && { requiresPayment }),
                ...(price !== undefined && { price }),
                ...(body.coHostIds !== undefined && {
                    coHosts: {
                        set: body.coHostIds.map(id => ({ id }))
                    }
                }),
            },
        });

        // Update custom questions if provided
        if (customQuestions !== undefined) {
            await prisma.customQuestion.deleteMany({ where: { eventTypeId: params.id } });
            if (customQuestions.length > 0) {
                await prisma.customQuestion.createMany({
                    data: customQuestions.map((q, i) => ({
                        eventTypeId: params.id,
                        question: q.question,
                        type: q.type || 'text',
                        required: q.required || false,
                        options: q.options || null,
                        order: i,
                    })),
                });
            }
        }

        return NextResponse.json({ eventType });
    } catch (error) {
        console.error('Error updating event type:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.eventType.delete({ where: { id: params.id } });

        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
