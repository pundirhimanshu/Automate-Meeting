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
    const { host, eventType, inviteeName, inviteeEmail, startTime, location, answers } = booking;

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
        }).join('\n')
    };

    let subject = workflow.subject;
    let body = workflow.body;

    // Replace variables {{Var Name}}
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value || '');
        body = body.replace(regex, value || '');
    });

    // Determine recipient
    let toEmail = '';
    if (workflow.sendTo === 'HOST') toEmail = host.email;
    else if (workflow.sendTo === 'INVITEE') toEmail = inviteeEmail;
    else toEmail = workflow.sendTo; // Specific email if supported later

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
