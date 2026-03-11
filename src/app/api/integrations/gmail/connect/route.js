import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const origin = process.env.NEXTAUTH_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
        const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || `${origin}/api/integrations/gmail/callback`;

        // Scope for sending emails on the user's behalf
        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email'
        ];

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&access_type=offline&prompt=consent`;

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Error initiating Gmail connection:', error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/integrations?error=gmail_connection_failed`);
    }
}
