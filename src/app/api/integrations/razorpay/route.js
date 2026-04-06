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
            select: { razorpayKeyId: true },
        });

        return NextResponse.json({
            connected: !!user?.razorpayKeyId,
        });
    } catch (error) {
        console.error('[RAZORPAY_GET_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { razorpayKeyId, razorpayKeySecret } = await request.json();

        if (!razorpayKeyId || !razorpayKeySecret) {
            return NextResponse.json({ error: 'Missing keys' }, { status: 400 });
        }

        // Encrypt the sensitive keys
        const encryptedId = encrypt(razorpayKeyId);
        const encryptedSecret = encrypt(razorpayKeySecret);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                razorpayKeyId: encryptedId,
                razorpayKeySecret: encryptedSecret,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[RAZORPAY_SAVE_ERROR]', error);
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
                razorpayKeyId: null,
                razorpayKeySecret: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[RAZORPAY_DELETE_ERROR]', error);
        return NextResponse.json({ 
            error: 'Failed to disconnect', 
            details: error.message 
        }, { status: 500 });
    }
}
