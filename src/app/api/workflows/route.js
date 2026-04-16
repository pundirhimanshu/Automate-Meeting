import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const workflows = await prisma.workflow.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: { eventTypes: { select: { id: true, title: true } } }
        });

        return NextResponse.json({ workflows });
    } catch (error) {
        console.error('Error fetching workflows:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // Optional validation
        if (!data.name || !data.trigger || !data.action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const workflow = await prisma.workflow.create({
            data: {
                name: data.name,
                userId: session.user.id,
                trigger: data.trigger,
                timeValue: data.timeValue ? parseInt(data.timeValue) : null,
                timeUnit: data.timeUnit,
                // Ensure these are arrays for the new schema
                action: Array.isArray(data.action) ? data.action : [data.action],
                sendTo: Array.isArray(data.sendTo) ? data.sendTo : [data.sendTo],
                senderEmail: data.senderEmail,
                subject: data.subject,
                body: data.body,
                isActive: true,
                ...(data.eventTypes && data.eventTypes.length > 0 && data.eventTypes[0] !== 'ALL' && {
                    eventTypes: {
                        connect: data.eventTypes.map(id => ({ id }))
                    }
                })
            }
        });

        return NextResponse.json({ workflow }, { status: 201 });
    } catch (error) {
        console.error('CRITICAL: Error creating workflow:', error);
        return NextResponse.json({
            error: 'Server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
