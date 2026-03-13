import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: formId } = params;
        const body = await request.json();
        const { questionId, operator, value, destination, isFallback, order } = body;

        // Verify form ownership
        const form = await prisma.routingForm.findUnique({ where: { id: formId, userId: session.user.id } });
        if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

        const rule = await prisma.routingRule.create({
            data: {
                formId,
                questionId,
                operator,
                value,
                destination,
                isFallback,
                order: order || 0
            }
        });

        return NextResponse.json({ rule }, { status: 201 });
    } catch (error) {
        console.error('Error creating routing rule:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: formId } = params;
        const body = await request.json();
        const { rules } = body;

        // Verify form ownership
        const form = await prisma.routingForm.findUnique({ where: { id: formId, userId: session.user.id } });
        if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

        // Batch update rules
        await prisma.$transaction(
            rules.map((r) =>
                prisma.routingRule.upsert({
                    where: { id: r.id || 'new' },
                    update: {
                        questionId: r.questionId,
                        operator: r.operator,
                        value: r.value,
                        destination: r.destination,
                        isFallback: r.isFallback,
                        order: r.order
                    },
                    create: {
                        formId,
                        questionId: r.questionId,
                        operator: r.operator,
                        value: r.value,
                        destination: r.destination,
                        isFallback: r.isFallback,
                        order: r.order
                    }
                })
            )
        );

        return NextResponse.json({ message: 'Rules updated' });
    } catch (error) {
        console.error('Error batch updating routing rules:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
