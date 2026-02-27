import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.integration.delete({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: 'zoom',
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ZOOM_DISCONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Failed to disconnect Zoom' }, { status: 500 });
    }
}
