import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';

/**
 * Exchange OAuth code for HubSpot tokens
 */
export async function exchangeHubSpotCode(code) {
    const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
    const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
    const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[HUBSPOT] Token exchange failed:', errorText);
        throw new Error(errorText || 'Failed to exchange HubSpot code');
    }

    return await response.json();
}

/**
 * Refresh HubSpot access token if expired
 */
export async function getValidHubSpotToken(userId) {
    const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
    const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            hubspotAccessToken: true,
            hubspotRefreshToken: true,
            hubspotExpiresAt: true,
        },
    });

    if (!user?.hubspotRefreshToken) {
        return null;
    }

    // Check if token is still valid
    const now = new Date();
    const expiresAt = user.hubspotExpiresAt ? new Date(user.hubspotExpiresAt) : null;
    if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
        try {
            return decrypt(user.hubspotAccessToken);
        } catch (e) {
            console.error('[HUBSPOT] Failed to decrypt access token, will refresh');
        }
    }

    // Token expired — refresh it
    let refreshToken;
    try {
        refreshToken = decrypt(user.hubspotRefreshToken);
    } catch (e) {
        console.error('[HUBSPOT] Failed to decrypt refresh token');
        return null;
    }

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[HUBSPOT] Token refresh failed:', errorText);
        return null;
    }

    const data = await response.json();
    
    await prisma.user.update({
        where: { id: userId },
        data: {
            hubspotAccessToken: encrypt(data.access_token),
            hubspotRefreshToken: encrypt(data.refresh_token),
            hubspotExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
    });

    return data.access_token;
}

/**
 * Full HubSpot sync — single function, single token fetch, runs fast
 */
export async function syncBookingToHubSpot(userId, booking) {
    console.log('[HUBSPOT] Starting sync for booking:', booking.id);
    const startTs = Date.now();

    const token = await getValidHubSpotToken(userId);
    if (!token) {
        console.log('[HUBSPOT] No valid token — skipping sync');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // ---- STEP 1: Create or find Contact ----
    let contactId = null;
    const contactProps = {
        email: booking.inviteeEmail,
        firstname: booking.inviteeName?.split(' ')[0] || '',
        lastname: booking.inviteeName?.split(' ').slice(1).join(' ') || '.',
    };

    // Search for existing contact
    try {
        const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: booking.inviteeEmail }] }],
            }),
        });

        if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.total > 0) {
                contactId = searchData.results[0].id;
                // Update existing
                fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                    method: 'PATCH', headers,
                    body: JSON.stringify({ properties: contactProps }),
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.error('[HUBSPOT] Contact search error:', e.message);
    }

    // Create if not found
    if (!contactId) {
        try {
            const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
                method: 'POST', headers,
                body: JSON.stringify({ properties: contactProps }),
            });
            if (createRes.ok) {
                const createData = await createRes.json();
                contactId = createData.id;
            } else {
                const errText = await createRes.text();
                console.error('[HUBSPOT] Contact creation failed:', createRes.status, errText);
            }
        } catch (e) {
            console.error('[HUBSPOT] Contact creation error:', e.message);
        }
    }

    if (!contactId) {
        console.error('[HUBSPOT] Could not create or find contact — aborting meeting sync');
        return;
    }

    console.log('[HUBSPOT] Contact ready:', contactId);

    // ---- STEP 2: Create Meeting ----
    const startTime = new Date(booking.startTime).toISOString();
    const endTime = new Date(booking.endTime).toISOString();
    const title = booking.eventType?.title || 'Meeting';

    try {
        const meetRes = await fetch('https://api.hubapi.com/crm/v3/objects/meetings', {
            method: 'POST', headers,
            body: JSON.stringify({
                properties: {
                    hs_timestamp: startTime,
                    hs_meeting_title: `${title}: ${booking.inviteeName}`,
                    hs_meeting_body: `Scheduled via Automate Bookings.\nNotes: ${booking.notes || 'None'}`,
                    hs_internal_meeting_notes: `Booking ID: ${booking.id}`,
                    hs_meeting_start_time: startTime,
                    hs_meeting_end_time: endTime,
                    hs_meeting_outcome: 'SCHEDULED',
                },
            }),
        });

        if (meetRes.ok) {
            const meetData = await meetRes.json();
            console.log('[HUBSPOT] Meeting created:', meetData.id);

            // Associate meeting with contact (fire & forget for speed)
            fetch(`https://api.hubapi.com/crm/v4/objects/meetings/${meetData.id}/associations/contacts/${contactId}`, {
                method: 'PUT', headers,
                body: JSON.stringify([{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 200 }]),
            }).catch(e => console.error('[HUBSPOT] Association error:', e.message));
        } else {
            const errText = await meetRes.text();
            console.error('[HUBSPOT] Meeting creation failed:', meetRes.status, errText);
        }
    } catch (e) {
        console.error('[HUBSPOT] Meeting creation error:', e.message);
    }

    console.log(`[HUBSPOT] Sync completed in ${Date.now() - startTs}ms`);
}
