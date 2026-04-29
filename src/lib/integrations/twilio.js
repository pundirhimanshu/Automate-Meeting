import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { withRetry } from '@/lib/db-utils';

/**
 * Send SMS to a phone number using the host's Twilio credentials.
 * Returns silently if Twilio is not connected for this user.
 */
export async function sendTwilioSMS(userId, toPhone, message) {
    try {
        const user = await withRetry(() => prisma.user.findUnique({
            where: { id: userId },
            select: {
                twilioAccountSid: true,
                twilioAuthToken: true,
                twilioPhoneNumber: true,
            }
        }));

        if (!user || !user.twilioAccountSid || !user.twilioAuthToken || !user.twilioPhoneNumber) {
            console.log(`[TWILIO] User ${userId} has not connected Twilio. Skipping SMS.`);
            return false;
        }

        const accountSid = decrypt(user.twilioAccountSid).trim();
        const authToken = decrypt(user.twilioAuthToken).trim();
        let fromPhone = decrypt(user.twilioPhoneNumber).trim();

        if (!accountSid || !authToken || !fromPhone) {
            console.error(`[TWILIO] Failed to decrypt credentials for user ${userId}`);
            return false;
        }

        // Ensure fromPhone has +
        if (fromPhone && !fromPhone.startsWith('+')) {
            fromPhone = '+' + fromPhone.trim();
        }

        // Format the 'To' phone number to E.164 (must start with +)
        let formattedTo = toPhone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parens
        if (!formattedTo.startsWith('+')) {
            // Check if it already looks like it has a country code but just missing +
            // Heuristic: If it's more than 10 digits, assume it has country code
            if (formattedTo.length > 10) {
                formattedTo = '+' + formattedTo;
            } else {
                // If it's 10 digits, it's likely a domestic number without country code
                // This is a bit risky but better than failing outright. 
                // However, we don't know the default country. 
                // For now, let's just prepend + and let Twilio handle it or fail with a better error.
                formattedTo = '+' + formattedTo;
            }
        }

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        
        const params = new URLSearchParams();
        params.append('To', formattedTo);
        params.append('From', fromPhone);
        params.append('Body', message);

        let res;
        try {
            res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Automate-Bookings/1.0',
                },
                body: params.toString(),
            });
        } catch (fetchErr) {
            console.error(`[TWILIO_FETCH_FAILED] Socket/Network error: ${fetchErr.message}`);
            return false;
        }

        const data = await res.json();

        if (!res.ok) {
            console.error(`[TWILIO_ERROR] ${data.message || 'Unknown error'}`);
            return false;
        }

        console.log(`[TWILIO_SUCCESS] SMS sent to ${toPhone}: ${data.sid}`);
        return true;
    } catch (error) {
        console.error('[TWILIO_UNEXPECTED_ERROR]', error);
        return false;
    }
}
