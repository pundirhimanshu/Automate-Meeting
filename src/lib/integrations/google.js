import { prisma } from '@/lib/prisma';

async function getValidGoogleToken(userId) {
    const integration = await prisma.integration.findUnique({
        where: { userId_provider: { userId, provider: 'google_calendar' } },
    });

    if (!integration) return null;

    // Check if token is expired (with 5 min buffer)
    const isExpired = !integration.expiresAt || new Date(integration.expiresAt).getTime() < Date.now() + 300000;

    if (!isExpired) return integration.accessToken;

    // Refresh token
    if (!integration.refreshToken) return null;

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: integration.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error('Google token refresh failed');

        const expiresAt = new Date(Date.now() + data.expires_in * 1000);
        const updated = await prisma.integration.update({
            where: { id: integration.id },
            data: {
                accessToken: data.access_token,
                expiresAt,
            },
        });

        return updated.accessToken;
    } catch (e) {
        console.error('[GOOGLE_REFRESH_ERROR]', e);
        return null;
    }
}

export async function createGoogleMeetEvent({ title, description, startTime, endTime, attendeeEmail, userId }) {
    const token = await getValidGoogleToken(userId);
    if (!token) {
        throw new Error('Google Calendar not connected');
    }

    const event = {
        summary: title || 'Scheduled Meeting',
        description: description || '',
        start: {
            dateTime: new Date(startTime).toISOString(),
            timeZone: 'UTC',
        },
        end: {
            dateTime: new Date(endTime).toISOString(),
            timeZone: 'UTC',
        },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
        conferenceData: {
            createRequest: {
                requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 10 },
            ],
        },
    };

    const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('[GOOGLE_CALENDAR_CREATE_ERROR]', data);
        throw new Error(data.error?.message || 'Failed to create Google Calendar event');
    }

    // Extract Google Meet link
    const meetLink = data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video'
    )?.uri;

    return {
        meetLink: meetLink || null,
        calendarEventId: data.id,
        calendarLink: data.htmlLink,
    };
}
