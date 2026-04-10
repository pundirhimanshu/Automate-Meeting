import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Current user ID

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    try {
        // Exchange code for token
        const response = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID,
                client_secret: process.env.SLACK_CLIENT_SECRET,
                code,
                redirect_uri: process.env.SLACK_REDIRECT_URI,
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('[SLACK_OAUTH_ERROR]', data);
            return NextResponse.json({ error: data.error || 'Failed to exchange Slack code' }, { status: 500 });
        }

        // Store integration in database
        await prisma.integration.upsert({
            where: {
                userId_provider: {
                    userId: state,
                    provider: 'slack',
                },
            },
            update: {
                accessToken: data.access_token,
                slackWebhookUrl: data.incoming_webhook?.url || null,
                slackChannelId: data.incoming_webhook?.channel_id || null,
                slackChannelName: data.incoming_webhook?.channel || null,
            },
            create: {
                userId: state,
                provider: 'slack',
                accessToken: data.access_token,
                slackWebhookUrl: data.incoming_webhook?.url || null,
                slackChannelId: data.incoming_webhook?.channel_id || null,
                slackChannelName: data.incoming_webhook?.channel || null,
            },
        });

        // Redirect back to integrations page
        return NextResponse.redirect(new URL('/integrations', req.url));
    } catch (error) {
        console.error('[SLACK_CALLBACK_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error during Slack callback' }, { status: 500 });
    }
}
