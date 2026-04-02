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
            select: { dodoApiKey: true },
        });

        return NextResponse.json({
            connected: !!user?.dodoApiKey,
        });
    } catch (error) {
        console.error('[DODO_GET_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { dodoApiKey, dodoWebhookSecret } = await request.json();

        if (!dodoApiKey || !dodoWebhookSecret) {
            return NextResponse.json({ error: 'Missing keys' }, { status: 400 });
        }

        // Encrypt the sensitive keys
        const encryptedKey = encrypt(dodoApiKey);
        const encryptedSecret = encrypt(dodoWebhookSecret);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                dodoApiKey: encryptedKey,
                dodoWebhookSecret: encryptedSecret,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DODO_SAVE_ERROR]', error);
        return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                dodoApiKey: null,
                dodoWebhookSecret: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DODO_DELETE_ERROR]', error);
        return NextResponse.json({ 
            error: 'Failed to disconnect', 
            details: error.message 
        }, { status: 500 });
    }
}
