import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete the gmail integration record for this user
        await prisma.integration.deleteMany({
            where: {
                userId: session.user.id,
                provider: 'gmail'
            }
        });

        return NextResponse.json({ success: true, message: 'Gmail disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting Gmail:', error);
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}
