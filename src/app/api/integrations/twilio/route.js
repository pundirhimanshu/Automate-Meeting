import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { 
                twilioAccountSid: true,
                twilioPhoneNumber: true,
            },
        });

        return NextResponse.json({
            connected: !!user?.twilioAccountSid,
            twilioPhoneNumber: user?.twilioPhoneNumber ? decrypt(user.twilioPhoneNumber) : null,
        });
    } catch (error) {
        console.error('[TWILIO_GET_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = await request.json();

        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Encrypt sensitive data (with trim to avoid socket errors)
        const encryptedSid = encrypt(twilioAccountSid.trim());
        const encryptedToken = encrypt(twilioAuthToken.trim());
        const encryptedPhone = encrypt(twilioPhoneNumber.trim());

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twilioAccountSid: encryptedSid,
                twilioAuthToken: encryptedToken,
                twilioPhoneNumber: encryptedPhone,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[TWILIO_SAVE_ERROR]', error);
        return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        console.log('[TWILIO] Received disconnect request');
        const session = await getServerSession(authOptions);
        if (!session) {
            console.log('[TWILIO] Disconnect failed: Unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twilioAccountSid: null,
                twilioAuthToken: null,
                twilioPhoneNumber: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[TWILIO_DELETE_ERROR]', error);
        return NextResponse.json({ 
            error: 'Failed to disconnect', 
            details: error.message 
        }, { status: 500 });
    }
}
