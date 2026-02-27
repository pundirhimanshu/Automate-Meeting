import { prisma } from '@/lib/prisma';

async function getValidZoomToken(userId) {
    const integration = await prisma.integration.findUnique({
        where: { userId_provider: { userId, provider: 'zoom' } }
    });

    if (!integration) return null;

    // Check if token is expired (with 5 min buffer)
    const isExpired = !integration.expiresAt || new Date(integration.expiresAt).getTime() < Date.now() + 300000;

    if (!isExpired) return integration.accessToken;

    // Refresh token
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch('https://zoom.us/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: integration.refreshToken,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error('Refresh failed');

        const expiresAt = new Date(Date.now() + data.expires_in * 1000);
        const updated = await prisma.integration.update({
            where: { id: integration.id },
            data: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt
            }
        });

        return updated.accessToken;
    } catch (e) {
        console.error('[ZOOM_REFRESH_ERROR]', e);
        return null;
    }
}

export async function createZoomMeeting({ topic, startTime, duration, userId }) {
    const token = await getValidZoomToken(userId);
    if (!token) {
        throw new Error('Zoom account not connected');
    }

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic: topic || 'Scheduled Meeting',
            type: 2, // Scheduled meeting
            start_time: new Date(startTime).toISOString(),
            duration: duration || 30,
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false,
                mute_upon_entry: true,
                watermark: false,
                use_pmi: false,
                approval_type: 0,
                audio: 'both',
                auto_recording: 'none'
            }
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('[ZOOM_CREATE_ERROR]', data);
        throw new Error(data.message || 'Failed to create Zoom meeting');
    }

    return data.join_url;
}
