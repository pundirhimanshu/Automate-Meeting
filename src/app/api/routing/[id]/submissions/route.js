import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        const form = await prisma.routingForm.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!form) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        if (form.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const submissions = await prisma.routingSubmission.findMany({
            where: { formId: id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ submissions });
    } catch (error) {
        console.error('[API] Fetch submissions error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
