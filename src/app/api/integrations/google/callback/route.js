import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        const origin = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

        if (!session) {
            return NextResponse.redirect(new URL('/login', origin));
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            console.error('[GOOGLE_CALLBACK_ERROR]', error);
            return NextResponse.redirect(new URL('/integrations?error=google_denied', origin));
        }

        if (!code) {
            return NextResponse.redirect(new URL('/integrations?error=no_code', origin));
        }

        const redirectUri = `${origin}/api/integrations/google/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error('[GOOGLE_TOKEN_ERROR]', tokenData);
            return NextResponse.redirect(new URL('/integrations?error=token_failed', origin));
        }

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Store as google_calendar integration (covers both Calendar + Meet)
        await prisma.integration.upsert({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: 'google_calendar',
                },
            },
            update: {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || undefined,
                expiresAt,
            },
            create: {
                userId: session.user.id,
                provider: 'google_calendar',
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt,
            },
        });

        return NextResponse.redirect(new URL('/integrations', origin));
    } catch (error) {
        console.error('[GOOGLE_CALLBACK_ERROR]', error);
        const errOrigin = typeof request !== 'undefined' ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}` : 'https://automate-booking-v2.vercel.app';
        return NextResponse.redirect(new URL('/integrations?error=callback_failed', errOrigin));
    }
}
