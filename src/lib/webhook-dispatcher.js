import { prisma } from './prisma';

/**
 * Dispatches a webhook payload to the user's configured webhook URL (e.g., Pabbly).
 * @param {string} userId - The ID of the user whose webhook should be triggered.
 * @param {string} eventType - The type of event (e.g., 'booking.confirmed', 'booking.canceled').
 * @param {object} payload - The data to send in the webhook.
 */
export async function triggerWebhook(userId, eventType, payload, options = {}) {
    try {
        const { eventTypeId } = options;
        
        // 1. Fetch User (for global webhook) and EventType (for specific webhook)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { webhookUrl: true }
        });

        let targetUrl = user?.webhookUrl;
        let allowedEvents = user?.webhookEvents ? user.webhookEvents.split(',') : [];

        // 2. If eventTypeId is provided, check for a specific override URL and its allowed events
        if (eventTypeId) {
            const et = await prisma.eventType.findUnique({
                where: { id: eventTypeId },
                select: { webhookUrl: true, webhookEvents: true }
            });
            if (et?.webhookUrl) {
                targetUrl = et.webhookUrl;
                allowedEvents = et.webhookEvents ? et.webhookEvents.split(',') : [];
                console.log(`[WEBHOOK] Using event-specific URL for ${eventTypeId}`);
            }
        }

        if (!targetUrl) {
            return { success: false, message: 'No webhook URL configured (global or specific)' };
        }

        // 3. Event Filtering Logic
        if (allowedEvents.length > 0 && !allowedEvents.includes(eventType)) {
            console.log(`[WEBHOOK] Event ${eventType} skipped (not in allowed list: ${allowedEvents.join(', ')})`);
            return { success: true, message: 'Event skipped due to filtering' };
        }

        console.log(`[WEBHOOK] Sending ${eventType} to ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AutomateBookings-Webhook/1.0',
                'X-Event-Type': eventType
            },
            body: JSON.stringify({
                event: eventType,
                timestamp: new Date().toISOString(),
                data: payload
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[WEBHOOK] Delivery failed (${response.status}):`, errorText);
            return { success: false, status: response.status, message: errorText };
        }

        console.log(`[WEBHOOK] ${eventType} delivered successfully!`);
        return { success: true };
    } catch (err) {
        console.error('[WEBHOOK] Error dispatching webhook:', err.message);
        return { success: false, message: err.message };
    }
}
