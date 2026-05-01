import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { exchangeHubSpotCode } from '@/lib/integrations/hubspot';
import { encrypt } from '@/lib/encryption';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            console.error('[HUBSPOT_CALLBACK_ERROR]', error);
            return NextResponse.redirect(new URL('/integrations?error=hubspot_denied', request.url));
        }

        if (!code) {
            return NextResponse.redirect(new URL('/integrations?error=no_code', request.url));
        }

        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Exchange code for tokens
        const data = await exchangeHubSpotCode(code);

        // Save tokens to user
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                hubspotAccessToken: encrypt(data.access_token),
                hubspotRefreshToken: encrypt(data.refresh_token),
                hubspotExpiresAt: new Date(Date.now() + data.expires_in * 1000),
                // portalId is often in the initial response or can be fetched later
            },
        });

        // Redirect back to integrations page with success
        return NextResponse.redirect(new URL('/integrations?success=hubspot_connected', request.url));
    } catch (error) {
        console.error('[HUBSPOT_CALLBACK_ERROR]', error);
        return NextResponse.redirect(new URL('/integrations?error=hubspot_failed', request.url));
    }
}
