import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = params;

        const form = await prisma.routingForm.findUnique({
            where: { id, userId: session.user.id },
            include: {
                questions: { orderBy: { order: 'asc' } },
                rules: { orderBy: { order: 'asc' } }
            }
        });

        if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

        return NextResponse.json({ form });
    } catch (error) {
        console.error('Error fetching routing form:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = params;
        const body = await request.json();
        const { name, description, isActive } = body;

        const form = await prisma.routingForm.update({
            where: { id, userId: session.user.id },
            data: { name, description, isActive }
        });

        return NextResponse.json({ form });
    } catch (error) {
        console.error('Error updating routing form:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = params;

        await prisma.routingForm.delete({
            where: { id, userId: session.user.id }
        });

        return NextResponse.json({ message: 'Form deleted' });
    } catch (error) {
        console.error('Error deleting routing form:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
