import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { evaluateRoutingRules } from '@/lib/routing-engine';

export async function POST(request, { params }) {
    try {
        const { slug } = params;
        const body = await request.json();
        const { inviteeName, inviteeEmail, answers, source = 'internal' } = body;

        const form = await prisma.routingForm.findUnique({
            where: { slug },
            include: { rules: true, questions: true }
        });

        if (!form || !form.isActive) {
            return NextResponse.json({ error: 'Routing form not found or inactive' }, { status: 404 });
        }

        // 1. Evaluate Logic
        const destination = evaluateRoutingRules(form.rules, answers);

        // 2. Lead Capture (Create Contact)
        try {
            // Find a common host/user for this form to assign the contact
            const userId = form.userId;

            await prisma.contact.upsert({
                where: {
                    userId_email: {
                        userId: userId,
                        email: inviteeEmail,
                    }
                },
                update: {
                    name: inviteeName,
                    notes: `Routed via: ${form.name}\nAnswers: ${JSON.stringify(answers)}`,
                },
                create: {
                    name: inviteeName,
                    email: inviteeEmail,
                    userId: userId,
                    notes: `Routed via: ${form.name}\nAnswers: ${JSON.stringify(answers)}`,
                }
            });
        } catch (contactErr) {
            console.error('[ROUTING] Contact capture failed:', contactErr);
        }

        // 3. Log Submission
        await prisma.routingSubmission.create({
            data: {
                formId: form.id,
                inviteeName,
                inviteeEmail,
                answers,
                destination,
                source
            }
        });

        // 4. Transform destination if it's an event-type ID
        let finalUrl = destination;
        if (destination?.startsWith('event-type:')) {
            const etId = destination.split(':')[1];
            const et = await prisma.eventType.findUnique({
                where: { id: etId },
                include: { user: { select: { username: true } } }
            });
            if (et) {
                finalUrl = `/book/${et.user.username}/${et.slug}`;
            }
        }

        return NextResponse.json({ destination: finalUrl || '/scheduling' });
    } catch (error) {
        console.error('Error processing routing submission:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { slug } = params;

        const form = await prisma.routingForm.findUnique({
            where: { slug },
            include: {
                questions: { orderBy: { order: 'asc' } }
            }
        });

        if (!form || !form.isActive) {
            return NextResponse.json({ error: 'Routing form not found' }, { status: 404 });
        }

        return NextResponse.json({ form });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
