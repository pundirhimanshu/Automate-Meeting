import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Get HubSpot connection status
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { hubspotRefreshToken: true },
        });

        return NextResponse.json({ connected: !!user?.hubspotRefreshToken });
    } catch (error) {
        console.error('[HUBSPOT_STATUS_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Disconnect HubSpot
 */
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                hubspotAccessToken: null,
                hubspotRefreshToken: null,
                hubspotExpiresAt: null,
                hubspotPortalId: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[HUBSPOT_DISCONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
