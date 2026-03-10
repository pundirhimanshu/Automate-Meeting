import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        // Verify ownership and delete
        // We Use deleteMany with a filter on userId to ensure security
        const result = await prisma.eventType.deleteMany({
            where: {
                id: { in: ids },
                userId: session.user.id
            }
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.count
        });
    } catch (error) {
        console.error('Error in bulk delete:', error);
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}
