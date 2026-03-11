import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { hiddenContactCols: true }
        });

        const hiddenColumns = user?.hiddenContactCols ? JSON.parse(user.hiddenContactCols) : [];
        return NextResponse.json({ hiddenColumns });
    } catch (error) {
        console.error('Error fetching column settings:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { hiddenColumns } = await request.json();

        await prisma.user.update({
            where: { id: session.user.id },
            data: { hiddenContactCols: JSON.stringify(hiddenColumns || []) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving column settings:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
