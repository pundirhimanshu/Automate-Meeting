import { prisma } from './prisma';
import nodemailer from 'nodemailer';

// --- System Email Configuration (from .env) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
const EMAIL_FROM = process.env.EMAIL_FROM || `Scheduler <${process.env.GMAIL_USER}>`;

/**
 * Main entrance for triggering real-time workflows (Created, Canceled, Rescheduled)
 */
export async function triggerWorkflows(triggerType, bookingId) {
    console.log(`[WORKFLOWS] Triggering ${triggerType} for booking ${bookingId}`);

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                host: true,
                eventType: { include: { user: true, customQuestions: true } },
                answers: true
            }
        });

        if (!booking) return;

        // Find applicable workflows
        // Criteria: 
        // 1. Same user
        // 2. Matching trigger
        // 3. Either "All event types" (no et connection) or matching eventTypeId
        const workflows = await prisma.workflow.findMany({
            where: {
                userId: booking.eventType.userId,
                trigger: triggerType,
                isActive: true,
                OR: [
                    { eventTypes: { none: {} } }, // All event types
                    { eventTypes: { some: { id: booking.eventTypeId } } }
                ]
            }
        });

        console.log(`[WORKFLOWS] Found ${workflows.length} applicable workflows`);

        for (const wf of workflows) {
            await executeWorkflow(wf, booking);
        }
    } catch (err) {
        console.error('[WORKFLOWS] Error triggering workflows:', err);
    }
}

/**
 * Logic to actually process a single workflow execution
 */
export async function executeWorkflow(workflow, booking) {
    console.log(`[WORKFLOWS] Executing workflow: ${workflow.name} (${workflow.id})`);

    try {
        if (workflow.action === 'SEND_EMAIL') {
            await sendWorkflowEmail(workflow, booking);
        } else if (workflow.action === 'SEND_SLACK_MESSAGE') {
            await sendWorkflowSlackMessage(workflow, booking);
        }

        // Mark as executed on the booking to prevent duplicates during cron
        await prisma.booking.update({
            where: { id: booking.id },
            data: {
                executedWorkflows: {
                    push: workflow.id
                }
            }
        });
    } catch (err) {
        console.error(`[WORKFLOWS] Failed to execute workflow ${workflow.id}:`, err);
    }
}

/**
 * Handle variable replacement and email dispatch
 */
async function sendWorkflowEmail(workflow, booking) {
    const { host, eventType, inviteeName, inviteeEmail, startTime, location, answers, manageToken } = booking;
    
    // Ensure we have a token (fallback for older bookings)
    const secureToken = manageToken || booking.id; 
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const variables = {
        'Event Name': eventType.title,
        'Invitee Full Name': inviteeName,
        'Event Time': new Date(startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        'Event Date': new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        'Location': location || 'No location specified',
        'Event Description': eventType.description || '',
        'Host Full Name': host.name,
        'Questions And Answers': (answers || []).map(a => {
            const q = eventType.customQuestions?.find(cq => cq.id === a.questionId);
            return `${q?.question || 'Question'}: ${a.answer}`;
        }).join('\n'),
        'Review Link': `${baseUrl}/review/${secureToken}`
    };

    let subject = workflow.subject;
    let body = workflow.body;

    // Determine recipient first (so we can log it)
    let toEmail = '';
    if (workflow.sendTo === 'HOST') toEmail = host.email;
    else if (workflow.sendTo === 'INVITEE') toEmail = inviteeEmail;
    else toEmail = workflow.sendTo;

    // Replace variables {{Var Name}} gracefully handling spaces and case
    console.log(`[WORKFLOWS] Starting injection for: ${toEmail}`);
    console.log(`[WORKFLOWS] Raw body length: ${body?.length || 0}`);

    // Normalize for comparison: lowercase and alphanumeric only
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const replaceVars = (str) => {
        if (!str) return str;
        // Support both {{Var}} and ((Var)) just in case
        const pattern = /[\{\(]{2}\s*([^}\)]+)\s*[\}\)]{2}/gi;
        
        return str.replace(pattern, (match, p1) => {
            const rawKey = p1.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags
            const normalizedKey = normalize(rawKey);
            
            // Find match in variables map
            const matchKey = Object.keys(variables).find(k => normalize(k) === normalizedKey);
            
            if (matchKey) {
                console.log(`[WORKFLOWS] SUCCESS: Replaced ${match} with value`);
                return variables[matchKey] ?? '';
            }
            
            console.warn(`[WORKFLOWS] FAILED: No match for ${match} (Normalized: ${normalizedKey})`);
            return match;
        });
    };

    subject = replaceVars(subject);
    body = replaceVars(body);

    console.log(`[WORKFLOWS] Final body length after injection: ${body?.length || 0}`);

    if (!toEmail) return;

    if (workflow.senderEmail === 'gmail') {
        const sent = await sendViaGmail(workflow.userId, toEmail, subject, body);
        if (sent) return;
        console.warn(`[WORKFLOWS] Gmail send failed, falling back to system email for wf ${workflow.id}`);
    }

    // Default: system SMTP
    await transporter.sendMail({
        from: EMAIL_FROM,
        to: toEmail,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
    });
}

/**
 * Handle custom Slack message workflows
 */
async function sendWorkflowSlackMessage(workflow, booking) {
    const { host, eventType, inviteeName, inviteeEmail, startTime, location, answers, manageToken } = booking;
    
    // Ensure we have a token (fallback for older bookings)
    const secureToken = manageToken || booking.id; 
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const variables = {
        'Event Name': eventType.title,
        'Invitee Full Name': inviteeName,
        'Event Time': new Date(startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        'Event Date': new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        'Location': location || 'No location specified',
        'Event Description': eventType.description || '',
        'Host Full Name': host.name,
        'Questions And Answers': (answers || []).map(a => {
            const q = eventType.customQuestions?.find(cq => cq.id === a.questionId);
            return `${q?.question || 'Question'}: ${a.answer}`;
        }).join('\n'),
        'Review Link': `${baseUrl}/review/${secureToken}`
    };

    let body = workflow.body || '';

    // Normalize for comparison
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const replaceVars = (str) => {
        if (!str) return str;
        const pattern = /[\{\(]{2}\s*([^}\)]+)\s*[\}\)]{2}/gi;
        return str.replace(pattern, (match, p1) => {
            const rawKey = p1.trim().replace(/<[^>]*>/g, '');
            const normalizedKey = normalize(rawKey);
            const matchKey = Object.keys(variables).find(k => normalize(k) === normalizedKey);
            return matchKey ? (variables[matchKey] ?? '') : match;
        });
    };

    const finalMessage = replaceVars(body);

    if (!finalMessage) return;

    // Trigger Slack notification using the helper
    const { sendSlackNotification } = await import('./integrations/slack');
    await sendSlackNotification(workflow.userId, finalMessage);
}

/**
 * Send via user's connected Gmail API
 */
async function sendViaGmail(userId, to, subject, body) {
    try {
        const integration = await prisma.integration.findUnique({
            where: { userId_provider: { userId, provider: 'gmail' } }
        });

        if (!integration) return false;

        let accessToken = integration.accessToken;

        // Check if token needs refresh
        if (integration.expiresAt && new Date() > new Date(integration.expiresAt)) {
            accessToken = await refreshGoogleToken(integration);
        }

        const subjectBase64 = Buffer.from(subject).toString('base64');
        const internalBody = [
            `To: ${to}`,
            `From: ${integration.email}`,
            `Subject: =?utf-8?B?${subjectBase64}?=`,
            'Content-Type: text/html; charset=utf-8',
            '',
            body.replace(/\n/g, '<br>')
        ].join('\r\n');

        const base64EncodedEmail = Buffer.from(internalBody).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: base64EncodedEmail })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('[WORKFLOWS] Gmail API error response:', JSON.stringify(errData, null, 2));
            return false;
        }

        return true;
    } catch (err) {
        console.error('[WORKFLOWS] Unexpected Gmail API error:', err);
        return false;
    }
}

/**
 * Helper to refresh Google OAuth tokens
 */
async function refreshGoogleToken(integration) {
    if (!integration.refreshToken) throw new Error('No refresh token available');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: integration.refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error('Failed to refresh google token');

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await prisma.integration.update({
        where: { id: integration.id },
        data: {
            accessToken: data.access_token,
            expiresAt
        }
    });

    return data.access_token;
}
/**
 * Poller for time-based workflows (BEFORE_EVENT / AFTER_EVENT).
 * 
 * Designed to work with Vercel's Hobby plan (daily cron). 
 * Uses a 24-hour scan window so all pending reminders are caught in a single run.
 * The `executedWorkflows` array on each Booking prevents duplicate sends.
 */
export async function processScheduledWorkflows() {
    console.log('[WORKFLOWS_CRON] Starting scheduled workflow processing...');
    
    try {
        const workflows = await prisma.workflow.findMany({
            where: {
                isActive: true,
                trigger: { in: ['BEFORE_EVENT', 'AFTER_EVENT'] }
            },
            include: { eventTypes: { select: { id: true } } }
        });

        console.log(`[WORKFLOWS_CRON] Found ${workflows.length} active scheduled workflows.`);

        const now = new Date();

        for (const wf of workflows) {
            const timeValue = wf.timeValue || 0;
            const timeUnit = wf.timeUnit || 'MINUTES';
            
            // Calculate offset in milliseconds
            let offsetMs = 0;
            if (timeUnit === 'MINUTES') offsetMs = timeValue * 60 * 1000;
            else if (timeUnit === 'HOURS') offsetMs = timeValue * 60 * 60 * 1000;
            else if (timeUnit === 'DAYS') offsetMs = timeValue * 24 * 60 * 60 * 1000;

            // Use a 24-hour scan window to catch all events (compatible with daily cron)
            const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

            let windowStart, windowEnd;

            if (wf.trigger === 'BEFORE_EVENT') {
                // "Send X time before event" means we need events starting between
                // (now + offset) and (now + offset + 24h).
                // But we should also catch any we MISSED (already past the trigger point).
                // So scan from now to now + offset + 24h for the event start time.
                windowStart = new Date(now.getTime() + offsetMs - SCAN_WINDOW_MS);
                windowEnd = new Date(now.getTime() + offsetMs + SCAN_WINDOW_MS);
                
                // Only send if the trigger time has PASSED (i.e., event starts within offset from now or earlier)
                // We filter after fetching
            } else if (wf.trigger === 'AFTER_EVENT') {
                // "Send X time after event" means events that started at (now - offset) or earlier
                windowStart = new Date(now.getTime() - offsetMs - SCAN_WINDOW_MS);
                windowEnd = new Date(now.getTime() - offsetMs + SCAN_WINDOW_MS);
            }

            const isAllEventTypes = wf.eventTypes.length === 0;
            const eventTypeIds = wf.eventTypes.map(et => et.id);

            const bookings = await prisma.booking.findMany({
                where: {
                    status: 'confirmed',
                    startTime: {
                        gte: windowStart,
                        lte: windowEnd
                    },
                    hostId: wf.userId,
                    NOT: {
                        executedWorkflows: {
                            has: wf.id
                        }
                    },
                    ...(isAllEventTypes ? {} : {
                        eventTypeId: { in: eventTypeIds }
                    })
                },
                include: {
                    host: true,
                    eventType: { include: { user: true, customQuestions: true } },
                    answers: true
                }
            });

            // Filter to only bookings where the trigger time has actually passed
            const eligibleBookings = bookings.filter(b => {
                const eventStart = new Date(b.startTime).getTime();
                if (wf.trigger === 'BEFORE_EVENT') {
                    // Trigger time = eventStart - offset. Send if now >= triggerTime.
                    const triggerTime = eventStart - offsetMs;
                    return now.getTime() >= triggerTime;
                } else if (wf.trigger === 'AFTER_EVENT') {
                    // Trigger time = eventStart + offset. Send if now >= triggerTime.
                    const triggerTime = eventStart + offsetMs;
                    return now.getTime() >= triggerTime;
                }
                return false;
            });

            if (eligibleBookings.length > 0) {
                console.log(`[WORKFLOWS_CRON] Triggering "${wf.name}" for ${eligibleBookings.length} booking(s).`);
                for (const booking of eligibleBookings) {
                    await executeWorkflow(wf, booking);
                }
            }
        }

        console.log('[WORKFLOWS_CRON] Processing complete.');
    } catch (err) {
        console.error('[WORKFLOW_CRON_ERROR]', err);
    }
}
