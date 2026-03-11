import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error || !code) {
            console.error('Gmail OAuth error:', error);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/integrations?error=gmail_auth_failed`);
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/gmail/callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Failed to get Gmail tokens:', tokenData);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/integrations?error=gmail_token_failed`);
        }

        const { access_token, refresh_token, expires_in } = tokenData;

        // Fetch user email from Google UserInfo API
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const userData = await userRes.json();
        const connectedEmail = userData.email;

        // Upsert the integration
        await prisma.integration.upsert({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: 'gmail',
                },
            },
            update: {
                accessToken: access_token,
                ...(refresh_token && { refreshToken: refresh_token }),
                expiresAt: new Date(Date.now() + expires_in * 1000),
                email: connectedEmail,
            },
            create: {
                userId: session.user.id,
                provider: 'gmail',
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: new Date(Date.now() + expires_in * 1000),
                email: connectedEmail,
            },
        });

        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/integrations?success=gmail_connected`);
    } catch (error) {
        console.error('Error in Gmail callback:', error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/integrations?error=gmail_connection_failed`);
    }
}
