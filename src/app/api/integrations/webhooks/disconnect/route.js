import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Clear the global webhook URL from the user's profile
        await prisma.user.update({
            where: { id: session.user.id },
            data: { webhookUrl: null }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[WEBHOOK_DISCONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Failed to disconnect webhooks' }, { status: 500 });
    }
}
