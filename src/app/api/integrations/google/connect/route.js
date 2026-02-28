import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return NextResponse.json({ error: 'Google Calendar configuration missing' }, { status: 500 });
        }

        const scopes = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly',
        ].join(' ');

        const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&access_type=offline` +
            `&prompt=consent`;

        return NextResponse.redirect(googleUrl);
    } catch (error) {
        console.error('[GOOGLE_CONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Failed to initiate Google connection' }, { status: 500 });
    }
}
