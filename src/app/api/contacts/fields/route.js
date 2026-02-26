import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const fields = await prisma.contactCustomField.findMany({
            where: { userId: session.user.id },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json({ fields });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, type } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'Field name is required' }, { status: 400 });
        }

        const count = await prisma.contactCustomField.count({
            where: { userId: session.user.id },
        });

        const field = await prisma.contactCustomField.create({
            data: {
                name,
                type: type || 'text',
                userId: session.user.id,
                order: count,
            },
        });

        return NextResponse.json({ field }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const fieldId = searchParams.get('id');
        if (!fieldId) return NextResponse.json({ error: 'Field ID required' }, { status: 400 });

        await prisma.contactCustomField.delete({ where: { id: fieldId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
