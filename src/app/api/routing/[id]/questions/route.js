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
        const { questions } = body; 

        // Verify form ownership
        const form = await prisma.routingForm.findUnique({ where: { id: formId, userId: session.user.id } });
        if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

        // Logic for batch update/reorder/remove
        // 1. Get existing question IDs
        const existingQuestions = await prisma.routingQuestion.findMany({
            where: { formId }
        });
        const existingIds = existingQuestions.map(q => q.id);
        const incomingIds = questions.filter(q => q.id && !q.id.startsWith('temp-')).map(q => q.id);

        // 2. Delete questions not in the incoming list
        const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
        
        await prisma.$transaction(async (tx) => {
            // Delete removed questions
            if (idsToDelete.length > 0) {
                await tx.routingQuestion.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }

            // Upsert / Create questions
            for (const q of questions) {
                const isTemp = !q.id || q.id.startsWith('temp-');
                
                if (isTemp) {
                    await tx.routingQuestion.create({
                        data: {
                            formId,
                            label: q.label,
                            type: q.type,
                            identifier: q.identifier || q.label.toLowerCase().replace(/\s+/g, '_'),
                            required: q.required || false,
                            options: q.options ? JSON.stringify(q.options) : null,
                            order: q.order || 0
                        }
                    });
                } else {
                    await tx.routingQuestion.update({
                        where: { id: q.id },
                        data: {
                            label: q.label,
                            type: q.type,
                            identifier: q.identifier,
                            required: q.required,
                            options: q.options ? JSON.stringify(q.options) : null,
                            order: q.order
                        }
                    });
                }
            }
        });

        // Fetch and return the updated questions list
        const updatedQuestions = await prisma.routingQuestion.findMany({
            where: { formId },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({ questions: updatedQuestions });
    } catch (error) {
        console.error('Error batch updating routing questions:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
