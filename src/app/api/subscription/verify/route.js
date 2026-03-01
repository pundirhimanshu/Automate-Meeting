import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Admin endpoint to verify/activate subscriptions
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { userId, action } = await request.json();

        if (!userId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        if (action === 'approve') {
            const validUntil = new Date();
            validUntil.setMonth(validUntil.getMonth() + 1);

            await prisma.subscription.update({
                where: { userId },
                data: { status: 'active', validUntil },
            });
        } else {
            await prisma.subscription.update({
                where: { userId },
                data: { status: 'rejected', plan: 'free' },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[SUBSCRIPTION_VERIFY_ERROR]', error);
        return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 500 });
    }
}

// GET all pending subscriptions (for admin view)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const pending = await prisma.subscription.findMany({
            where: { status: 'pending_verification' },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(pending);
    } catch (error) {
        console.error('[SUBSCRIPTION_VERIFY_GET_ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch pending subscriptions' }, { status: 500 });
    }
}
