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
            await fetch(integration.slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message }),
            });
            return;
        }

        // Fallback to chat.postMessage if we have an access token and a channel ID
        if (integration.accessToken && integration.slackChannelId) {
            await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${integration.accessToken}`
                },
                body: JSON.stringify({
                    channel: integration.slackChannelId,
                    text: message
                }),
            });
        }
    } catch (error) {
        console.error('[SLACK_NOTIFICATION_ERROR]', error);
    }
}
