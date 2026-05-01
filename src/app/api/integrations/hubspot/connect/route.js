import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
        const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;
        
        // Scopes needed for contacts and meetings
        const scopes = [
            'crm.objects.contacts.write',
            'crm.objects.contacts.read',
            'crm.objects.appointments.write',
            'crm.objects.appointments.read'
        ].join(' ');

        const hubspotAuthUrl = `https://app.hubspot.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;

        return NextResponse.redirect(hubspotAuthUrl);
    } catch (error) {
        console.error('[HUBSPOT_CONNECT_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
