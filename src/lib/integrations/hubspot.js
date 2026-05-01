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
        console.log('[HUBSPOT] No refresh token found for user:', userId);
        return null;
    }

    // Check if token is still valid (not expired and not expiring in next 5 minutes)
    const now = new Date();
    const expiresAt = user.hubspotExpiresAt ? new Date(user.hubspotExpiresAt) : null;
    if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
        try {
            return decrypt(user.hubspotAccessToken);
        } catch (e) {
            console.error('[HUBSPOT] Failed to decrypt access token, will refresh:', e.message);
        }
    }

    // Token expired or about to expire — refresh it
    console.log('[HUBSPOT] Refreshing access token for user:', userId);
    let refreshToken;
    try {
        refreshToken = decrypt(user.hubspotRefreshToken);
    } catch (e) {
        console.error('[HUBSPOT] Failed to decrypt refresh token:', e.message);
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
    
    // Save new tokens
    await prisma.user.update({
        where: { id: userId },
        data: {
            hubspotAccessToken: encrypt(data.access_token),
            hubspotRefreshToken: encrypt(data.refresh_token),
            hubspotExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
    });

    console.log('[HUBSPOT] Token refreshed successfully');
    return data.access_token;
}

/**
 * Create or Update a Contact in HubSpot
 */
export async function syncHubSpotContact(userId, booking) {
    console.log('[HUBSPOT] Syncing contact for booking:', booking.id, 'Email:', booking.inviteeEmail);
    
    const token = await getValidHubSpotToken(userId);
    if (!token) {
        console.log('[HUBSPOT] No valid token — skipping contact sync');
        return null;
    }

    const properties = {
        email: booking.inviteeEmail,
        firstname: booking.inviteeName?.split(' ')[0] || '',
        lastname: booking.inviteeName?.split(' ').slice(1).join(' ') || '.',
    };

    console.log('[HUBSPOT] Creating/updating contact with properties:', JSON.stringify(properties));

    // Try to search for existing contact by email
    try {
        const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{ propertyName: 'email', operator: 'EQ', value: booking.inviteeEmail }]
                }],
            }),
        });

        if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.total > 0) {
                const contactId = searchData.results[0].id;
                console.log('[HUBSPOT] Found existing contact:', contactId);
                // Update existing contact
                await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ properties }),
                });
                return contactId;
            }
        } else {
            const errText = await searchRes.text();
            console.error('[HUBSPOT] Contact search failed:', searchRes.status, errText);
        }
    } catch (searchErr) {
        console.error('[HUBSPOT] Contact search error:', searchErr.message);
    }

    // Create new contact
    try {
        const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties }),
        });

        if (createRes.ok) {
            const createData = await createRes.json();
            console.log('[HUBSPOT] Created new contact:', createData.id);
            return createData.id;
        } else {
            const errText = await createRes.text();
            console.error('[HUBSPOT] Contact creation failed:', createRes.status, errText);
        }
    } catch (createErr) {
        console.error('[HUBSPOT] Contact creation error:', createErr.message);
    }

    return null;
}

/**
 * Log a Meeting in HubSpot and associate it with a contact
 */
export async function syncHubSpotMeeting(userId, booking, contactId) {
    console.log('[HUBSPOT] Syncing meeting for booking:', booking.id, 'Contact:', contactId);

    const token = await getValidHubSpotToken(userId);
    if (!token || !contactId) return null;

    const startTime = new Date(booking.startTime).toISOString();
    const endTime = new Date(booking.endTime).toISOString();
    const title = booking.eventType?.title || 'Meeting';

    const meetingData = {
        properties: {
            hs_timestamp: startTime,
            hs_meeting_title: `${title}: ${booking.inviteeName}`,
            hs_meeting_body: `Scheduled via Automate Bookings.\n\nNotes: ${booking.notes || 'None'}`,
            hs_internal_meeting_notes: `Booking ID: ${booking.id}`,
            hs_meeting_start_time: startTime,
            hs_meeting_end_time: endTime,
            hs_meeting_outcome: 'SCHEDULED',
        },
    };

    try {
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/meetings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(meetingData),
        });

        if (res.ok) {
            const data = await res.json();
            const meetingId = data.id;
            console.log('[HUBSPOT] Created meeting:', meetingId);

            // Associate meeting with contact
            const assocRes = await fetch(`https://api.hubapi.com/crm/v4/objects/meetings/${meetingId}/associations/contacts/${contactId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 200 }]),
            });

            if (assocRes.ok) {
                console.log('[HUBSPOT] Meeting associated with contact successfully');
            } else {
                const assocErr = await assocRes.text();
                console.error('[HUBSPOT] Meeting association failed:', assocRes.status, assocErr);
            }

            return meetingId;
        } else {
            const errText = await res.text();
            console.error('[HUBSPOT] Meeting creation failed:', res.status, errText);
        }
    } catch (meetErr) {
        console.error('[HUBSPOT] Meeting creation error:', meetErr.message);
    }

    return null;
}
