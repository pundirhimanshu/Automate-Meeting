import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

// GET - Check connection status
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripeAccountId: true, stripeSecretKey: true },
        });

        return NextResponse.json({
            connectMethod: user?.stripeAccountId ? 'connect' : user?.stripeSecretKey ? 'keys' : null,
            connected: !!(user?.stripeAccountId || user?.stripeSecretKey),
            stripeAccountId: user?.stripeAccountId || null,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST - Save manual API keys
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { stripeSecretKey, stripeWebhookSecret } = await request.json();

        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Secret key is required' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                stripeSecretKey: encrypt(stripeSecretKey),
                stripeWebhookSecret: stripeWebhookSecret ? encrypt(stripeWebhookSecret) : null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[STRIPE_KEYS_ERROR]', error);
        return NextResponse.json({ error: 'Failed to save keys' }, { status: 500 });
    }
}

// DELETE - Remove manual keys
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                stripeSecretKey: null,
                stripeWebhookSecret: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
