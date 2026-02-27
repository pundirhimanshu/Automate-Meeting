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

        const clientId = process.env.ZOOM_CLIENT_ID;
        const redirectUri = process.env.ZOOM_REDIRECT_URI;

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
