import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { sendTwilioSMS } from '@/lib/integrations/twilio';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { testPhoneNumber } = await request.json();

        if (!testPhoneNumber) {
            return NextResponse.json({ error: 'Phone number is required for testing' }, { status: 400 });
        }

        const success = await sendTwilioSMS(
            session.user.id, 
            testPhoneNumber, 
            '📱 Test message from Automate Meetings! Your Twilio integration is working correctly.'
        );

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to send test SMS. Please check your credentials and try again.' }, { status: 500 });
        }
    } catch (error) {
        console.error('[TWILIO_TEST_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
