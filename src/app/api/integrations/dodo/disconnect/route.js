import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                dodoApiKey: null,
                dodoWebhookSecret: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DODO_DISCONNECT_POST_ERROR]', error);
        return NextResponse.json({ error: 'Failed to disconnect integration' }, { status: 500 });
    }
}
