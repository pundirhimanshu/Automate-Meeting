import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { triggerWebhook } from '@/lib/webhook-dispatcher';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { webhookUrl: true, webhookEvents: true }
        });

        return NextResponse.json({ 
            webhookUrl: user.webhookUrl,
            webhookEvents: user.webhookEvents
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { webhookUrl, webhookEvents, test } = await request.json();

        if (test) {
            // Send a test payload to the provided URL (or existing one)
            const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { webhookUrl: true } });
            const targetUrl = webhookUrl || user?.webhookUrl;
            
            if (!targetUrl) return NextResponse.json({ error: 'No webhook URL provided for testing' }, { status: 400 });

            // Create a temporary mock payload for testing
            const testPayload = {
                bookingId: 'test-12345',
                eventTitle: 'Test Discovery Call',
                inviteeName: 'John Doe',
                inviteeEmail: 'john@example.com',
                startTime: new Date().toISOString(),
                location: 'Google Meet',
                notes: 'This is a test booking from Automate Bookings'
            };

            // Temporarily use the provided URL even if not saved yet
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Event-Type': 'test.trigger' },
                body: JSON.stringify({ event: 'test.trigger', data: testPayload })
            });

            if (!response.ok) {
                return NextResponse.json({ error: `Test failed with status ${response.status}` }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: 'Test booking sent successfully!' });
        }

        // Save the Webhook URL and Events
        await prisma.user.update({
            where: { id: session.user.id },
            data: { 
                webhookUrl: webhookUrl || null,
                webhookEvents: webhookEvents || null
            }
        });

        return NextResponse.json({ success: true, message: 'Webhook URL updated' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
