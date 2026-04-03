import { NextResponse } from 'next/server';
import { processScheduledWorkflows } from '@/lib/workflow-engine';

export async function GET(req) {
    try {
        // Optional: Security check for CRON_SECRET if you want to keep this private
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CRON_WORKFLOW] Triggering poller manually/via cron...');
        await processScheduledWorkflows();

        return NextResponse.json({ success: true, message: 'Workflows processed' });
    } catch (error) {
        console.error('[CRON_WORKFLOW_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Support POST as well for consistency with some schedulers
export async function POST(req) {
    return GET(req);
}
