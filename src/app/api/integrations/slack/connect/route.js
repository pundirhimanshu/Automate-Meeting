import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = process.env.SLACK_CLIENT_ID;
        const redirectUri = process.env.SLACK_REDIRECT_URI;
        
        // Scopes: 
        // - incoming-webhook: For simple notifications
        // - chat:write: For sending messages to specific channels
        // - channels:read: To list public channels for selection
        const scopes = [
            'incoming-webhook',
            'chat:write',
            'channels:read'
        ].join(',');

        const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&user_scope=&redirect_uri=${encodeURIComponent(redirectUri)}&state=${session.user.id}`;

        return NextResponse.redirect(slackUrl);
    } catch (error) {
        console.error('[SLACK_CONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Failed to initiate Slack connection' }, { status: 500 });
    }
}
