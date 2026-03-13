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
        const { type, label, identifier, required, options, order } = body;

        // Verify form ownership
        const form = await prisma.routingForm.findUnique({ where: { id: formId, userId: session.user.id } });
        if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

        const question = await prisma.routingQuestion.create({
            data: {
                formId,
                type,
                label,
                identifier,
                required,
                options: options ? JSON.stringify(options) : null,
                order: order || 0
            }
        });

        return NextResponse.json({ question }, { status: 201 });
    } catch (error) {
        console.error('Error creating routing question:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: formId } = params;
        const body = await request.json();
        const { questions } = body; // Array of questions for batch update/reorder

        // Verify form ownership
        const form = await prisma.routingForm.findUnique({ where: { id: formId, userId: session.user.id } });
        if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

        // Batch update questions
        await prisma.$transaction(
            questions.map((q) =>
                prisma.routingQuestion.upsert({
                    where: { id: q.id || 'new' },
                    update: {
                        label: q.label,
                        type: q.type,
                        identifier: q.identifier,
                        required: q.required,
                        options: q.options ? JSON.stringify(q.options) : null,
                        order: q.order
                    },
                    create: {
                        formId,
                        label: q.label,
                        type: q.type,
                        identifier: q.identifier,
                        required: q.required,
                        options: q.options ? JSON.stringify(q.options) : null,
                        order: q.order
                    }
                })
            )
        );

        return NextResponse.json({ message: 'Questions updated' });
    } catch (error) {
        console.error('Error batch updating routing questions:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
