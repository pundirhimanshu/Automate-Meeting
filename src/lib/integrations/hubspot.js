import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;

/**
 * Exchange OAuth code for HubSpot tokens
 */
export async function exchangeHubSpotCode(code) {
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
        const error = await response.json();
        throw new Error(error.message || 'Failed to exchange HubSpot code');
    }

    return await response.json();
}

/**
 * Refresh HubSpot access token if expired
 */
export async function getValidHubSpotToken(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            hubspotAccessToken: true,
            hubspotRefreshToken: true,
            hubspotExpiresAt: true,
        },
    });

    if (!user?.hubspotRefreshToken) return null;

    // Check if token is expired or expires in the next 5 minutes
    const now = new Date();
    if (user.hubspotExpiresAt && new Date(user.hubspotExpiresAt) > new Date(now.getTime() + 5 * 60 * 1000)) {
        return decrypt(user.hubspotAccessToken);
    }

    // Refresh token
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: decrypt(user.hubspotRefreshToken),
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!response.ok) {
        throw new Error('Failed to refresh HubSpot token');
    }

    const data = await response.json();
    
    // Save new tokens
    const { encrypt } = await import('@/lib/encryption');
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
 * Create or Update a Contact in HubSpot
 */
export async function syncHubSpotContact(userId, booking) {
    const token = await getValidHubSpotToken(userId);
    if (!token) return null;

    const properties = {
        email: booking.inviteeEmail,
        firstname: booking.inviteeName.split(' ')[0],
        lastname: booking.inviteeName.split(' ').slice(1).join(' ') || '.',
        phone: booking.inviteePhone || '',
    };

    // Attempt to search for existing contact
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filters: [{ propertyName: 'email', operator: 'EQ', value: booking.inviteeEmail }],
        }),
    });

    let contactId;
    if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.total > 0) {
            contactId = searchData.results[0].id;
            // Update existing contact
            await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ properties }),
            });
        }
    }

    if (!contactId) {
        // Create new contact
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
            contactId = createData.id;
        }
    }

    return contactId;
}

/**
 * Log a Meeting in HubSpot
 */
export async function syncHubSpotMeeting(userId, booking, contactId) {
    const token = await getValidHubSpotToken(userId);
    if (!token || !contactId) return null;

    const startTime = new Date(booking.startTime).toISOString();
    const endTime = new Date(booking.endTime).toISOString();

    const meetingData = {
        properties: {
            hs_timestamp: new Date().toISOString(),
            hs_meeting_title: `${booking.eventType.title}: ${booking.inviteeName}`,
            hs_meeting_body: `Scheduled meeting via Automate Bookings.\n\nNotes: ${booking.notes || 'None'}`,
            hs_internal_meeting_notes: `Booking ID: ${booking.id}`,
            hs_meeting_start_time: startTime,
            hs_meeting_end_time: endTime,
            hs_meeting_outcome: 'SCHEDULED',
        },
    };

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

        // Associate meeting with contact
        await fetch(`https://api.hubapi.com/crm/v3/associations/meetings/contacts/batch/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: [
                    {
                        from: { id: meetingId },
                        to: { id: contactId },
                        type: 'meeting_to_contact'
                    }
                ]
            }),
        });

        return meetingId;
    }

    return null;
}
