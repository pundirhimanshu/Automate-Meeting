import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const workflow = await prisma.workflow.findUnique({
            where: { id },
            include: { eventTypes: { select: { id: true } } }
        });

        if (!workflow || workflow.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ workflow });
    } catch (error) {
        console.error('Error fetching workflow:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const data = await request.json();

        const workflow = await prisma.workflow.findUnique({
            where: { id }
        });

        if (!workflow || workflow.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        // Handle full update
        const updateData = {
            name: data.name,
            trigger: data.trigger,
            timeValue: data.timeValue !== undefined ? (data.timeValue ? parseInt(data.timeValue) : null) : undefined,
            timeUnit: data.timeUnit,
            // Ensure these are arrays for the new schema
            action: data.action ? (Array.isArray(data.action) ? data.action : [data.action]) : undefined,
            sendTo: data.sendTo ? (Array.isArray(data.sendTo) ? data.sendTo : [data.sendTo]) : undefined,
            senderEmail: data.senderEmail,
            subject: data.subject,
            body: data.body,
            isActive: data.isActive !== undefined ? data.isActive : undefined,
        };

        // Handle eventTypes separately due to connection logic
        if (data.eventTypes) {
            if (data.eventTypes.includes('ALL')) {
                // If ALL is selected, disconnect all existing connections
                updateData.eventTypes = { set: [] };
            } else {
                updateData.eventTypes = {
                    set: data.eventTypes.map(id => ({ id }))
                };
            }
        }

        const updated = await prisma.workflow.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ workflow: updated });
    } catch (error) {
        console.error('Error updating workflow:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const workflow = await prisma.workflow.findUnique({
            where: { id }
        });

        if (!workflow || workflow.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        await prisma.workflow.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Workflow deleted' });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
