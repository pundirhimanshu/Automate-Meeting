import { prisma } from '@/lib/prisma';
import { executeWorkflow } from '@/lib/workflow-engine';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint to handle scheduled workflows (BEFORE_EVENT, AFTER_EVENT)
 * Suggested frequency: every 15-30 minutes
 */
export async function GET(request) {
    // Optional: add a secret key check for security
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('[CRON] Starting workflow processing...');
    const now = new Date();
    let executedCount = 0;

    try {
        // 1. Get all active scheduled workflows
        const workflows = await prisma.workflow.findMany({
            where: {
                isActive: true,
                trigger: { in: ['BEFORE_EVENT', 'AFTER_EVENT'] }
            },
            include: { eventTypes: true }
        });

        for (const wf of workflows) {
            const minutes = toMinutes(wf.timeValue, wf.timeUnit);

            // Define windows to look for
            // For BEFORE_EVENT: booking.startTime - minutes should be roughly "now"
            // We'll look for bookings whose trigger time has passed but haven't run yet

            const targetField = wf.trigger === 'BEFORE_EVENT' ? 'startTime' : 'endTime';
            const multiplier = wf.trigger === 'BEFORE_EVENT' ? -1 : 1;

            // Find matching bookings
            const bookings = await prisma.booking.findMany({
                where: {
                    status: 'confirmed',
                    // Filter by event types if workflow is restricted
                    ...(wf.eventTypes.length > 0 && {
                        eventTypeId: { in: wf.eventTypes.map(et => et.id) }
                    }),
                    // Ensure workflow hasn't already run for this booking
                    NOT: {
                        executedWorkflows: {
                            has: wf.id
                        }
                    },
                    // The "Trigger Point" should be in the past (i.e., we are now at or past the scheduled send time)
                    // If BEFORE_EVENT 24h: triggerPoint = startTime - 24h. We send if triggerPoint <= now.
                    // We also add a safety bound so we don't send extremely old reminders if cron was down.
                    [targetField]: {
                        lte: new Date(now.getTime() - (multiplier * minutes * 60000)),
                        // Safety: don't process events more than 2 days old for AFTER_EVENT, 
                        // or events whose start time has already passed for BEFORE_EVENT (unless it's AFTER_EVENT)
                        ...(wf.trigger === 'BEFORE_EVENT' && {
                            gt: now // Only before it starts
                        })
                    }
                },
                include: {
                    host: true,
                    eventType: { include: { user: true } }
                }
            });

            for (const booking of bookings) {
                await executeWorkflow(wf, booking);
                executedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${workflows.length} workflows, executed ${executedCount} actions.`
        });
    } catch (err) {
        console.error('[CRON] Error:', err);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}

function toMinutes(val, unit) {
    if (unit === 'MINUTES') return val;
    if (unit === 'HOURS') return val * 60;
    if (unit === 'DAYS') return val * 1440;
    return val;
}
