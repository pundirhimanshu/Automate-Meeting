import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.integration.delete({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: 'slack',
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[SLACK_DISCONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Failed to disconnect Slack' }, { status: 500 });
    }
}
