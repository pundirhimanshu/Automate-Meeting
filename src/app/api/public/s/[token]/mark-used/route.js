import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { token } = params;

        await prisma.singleUseLink.update({
            where: { token },
            data: { isUsed: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking single-use link:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
