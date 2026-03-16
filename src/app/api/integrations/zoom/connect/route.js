import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUseIntegration } from '@/lib/plans';

export const dynamic = 'force-dynamic';

import { getUserSubscription } from '@/lib/subscription';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            const origin = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
            return NextResponse.redirect(new URL('/login', origin));
        }

        // Plan enforcement: check if user can use Zoom
        const { plan: userPlan } = await getUserSubscription(session.user.id);

        if (!canUseIntegration('zoom', userPlan)) {
            return NextResponse.redirect(new URL('/subscription?upgrade=zoom', process.env.NEXTAUTH_URL));
        }

        const clientId = process.env.ZOOM_CLIENT_ID;
        const origin = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
        const redirectUri = `${origin}/api/integrations/zoom/callback`;

        if (!clientId || !redirectUri) {
            return NextResponse.json({ error: 'Zoom configuration missing' }, { status: 500 });
        }

        const zoomUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        return NextResponse.redirect(zoomUrl);
    } catch (error) {
        console.error('[ZOOM_CONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Failed to initiate Zoom connection' }, { status: 500 });
    }
}
