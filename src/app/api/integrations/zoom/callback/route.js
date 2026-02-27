import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.redirect(new URL('/integrations?error=no_code', request.url));
        }

        const clientId = process.env.ZOOM_CLIENT_ID;
        const clientSecret = process.env.ZOOM_CLIENT_SECRET;
        const redirectUri = process.env.ZOOM_REDIRECT_URI;

        // Exchange code for tokens
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('[ZOOM_TOKEN_ERROR]', tokens);
            return NextResponse.redirect(new URL('/integrations?error=token_exchange_failed', request.url));
        }

        // Save or update tokens in database
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        await prisma.integration.upsert({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: 'zoom',
                },
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
            },
            create: {
                userId: session.user.id,
                provider: 'zoom',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
            },
        });

        return NextResponse.redirect(new URL('/integrations?success=zoom_connected', request.url));
    } catch (error) {
        console.error('[ZOOM_CALLBACK_ERROR]', error);
        return NextResponse.redirect(new URL('/integrations?error=callback_failed', request.url));
    }
}
