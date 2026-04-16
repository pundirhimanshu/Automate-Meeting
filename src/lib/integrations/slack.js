import { prisma } from '@/lib/prisma';

export async function sendSlackNotification(userId, message) {
    try {
        const integration = await prisma.integration.findUnique({
            where: {
                userId_provider: {
                    userId,
                    provider: 'slack'
                }
            }
        });

        if (!integration || (!integration.slackWebhookUrl && !integration.accessToken)) {
            return;
        }

        // Use Incoming Webhook if available (easiest for single channel)
        if (integration.slackWebhookUrl) {
            const res = await fetch(integration.slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message }),
            });
            if (!res.ok) {
                console.error('[SLACK_WEBHOOK_ERROR]', await res.text());
            }
            return;
        }

        // Fallback to chat.postMessage if we have an access token and a channel ID
        if (integration.accessToken && integration.slackChannelId) {
            const res = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    channel: integration.slackChannelId,
                    text: message
                }),
            });
            if (!res.ok) {
                console.error('[SLACK_API_ERROR]', await res.text());
            }
        }
    } catch (error) {
        console.error('[SLACK_NOTIFICATION_ERROR]', error);
    }
}
