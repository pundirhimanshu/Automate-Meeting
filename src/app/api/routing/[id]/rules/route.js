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
                logicType: body.logicType || 'AND',
                conditions: body.conditions || null,
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

        // Logic for batch update/reorder/remove
        // 1. Get existing rule IDs
        const existingRules = await prisma.routingRule.findMany({
            where: { formId }
        });
        const existingIds = existingRules.map(r => r.id);
        const incomingIds = rules.filter(r => r.id && !r.id.startsWith('temp-')).map(r => r.id);

        // 2. Delete rules not in the incoming list
        const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

        await prisma.$transaction(async (tx) => {
            // Delete removed rules
            if (idsToDelete.length > 0) {
                await tx.routingRule.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }

            // Upsert / Create rules
            for (const r of rules) {
                const isTemp = !r.id || r.id.startsWith('temp-');
                
                if (isTemp) {
                    await tx.routingRule.create({
                        data: {
                            formId,
                            questionId: r.questionId,
                            operator: r.operator,
                            value: r.value,
                            destination: r.destination,
                            logicType: r.logicType || 'AND',
                            conditions: r.conditions || null,
                            order: r.order || 0
                        }
                    });
                } else {
                    await tx.routingRule.update({
                        where: { id: r.id },
                        data: {
                            questionId: r.questionId,
                            operator: r.operator,
                            value: r.value,
                            logicType: r.logicType,
                            conditions: r.conditions,
                            order: r.order
                        }
                    });
                }
            }
        });

        // Fetch and return updated rules
        const updatedRules = await prisma.routingRule.findMany({
            where: { formId },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({ rules: updatedRules });
    } catch (error) {
        console.error('Error batch updating routing rules:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
