import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { sendBookingConfirmation } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log(`[TEST-EMAIL] Triggering test email for ${user.email}`);

        // Mock data for test
        const mockBooking = { id: 'test-id', notes: 'This is a test email from the Automate Meetings setup helper.' };
        const mockEventType = { title: 'Integration Test Meeting', location: 'Dashboard' };

        await sendBookingConfirmation({
            booking: mockBooking,
            eventType: mockEventType,
            host: user,
            inviteeName: 'Test Invitee',
            inviteeEmail: user.email, // Send to self as test
            startTime: new Date(),
        });

        return NextResponse.json({ message: 'Test email triggered! Check your terminal logs and inbox.' });
    } catch (error) {
        console.error('[TEST-EMAIL] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
