import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(req) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const reviews = await prisma.review.findMany({
            where: { host: { email: session.user.email } },
            include: {
                booking: { select: { inviteeName: true, eventType: { select: { title: true } }, startTime: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(reviews);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, isPublic } = await req.json();

        // Verify ownership before update
        const existingReview = await prisma.review.findUnique({
            where: { id },
            include: { host: { select: { email: true } } }
        });

        if (!existingReview || existingReview.host.email !== session.user.email) {
             return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
        }

        const review = await prisma.review.update({
            where: { id },
            data: { isPublic }
        });

        return NextResponse.json({ success: true, review });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
