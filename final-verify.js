const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function simulateReplacement(body, variables) {
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pattern = /[\{\(]{2}\s*([^}\)]+)\s*[\}\)]{2}/gi;

    console.log('[DEBUG] Input body:', body);
    
    const result = body.replace(pattern, (match, p1) => {
        const rawKey = p1.trim().replace(/<[^>]*>/g, '');
        const normalizedKey = normalize(rawKey);
        const matchKey = Object.keys(variables).find(k => normalize(k) === normalizedKey);
        
        if (matchKey) {
            console.log(`[DEBUG] SUCCESS: Replaced {{${rawKey}}} with value`);
            return variables[matchKey];
        } else {
            console.log(`[DEBUG] FAILED: No match found for {{${rawKey}}}. Available: ${Object.keys(variables).join(', ')}`);
            return match;
        }
    });

    return result;
}

async function runTest() {
    const workflowId = 'ecbc73a2-4a59-410d-aaf6-80bafa2dbb89';
    const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    
    if (!wf) {
        console.log('Workflow not found with ID:', workflowId);
        return;
    }

    const testVariables = {
        'Review Link': 'https://automate-bookings.com/review/TEST-TOKEN',
        'Invitee Full Name': 'Test User',
        'Event Name': 'Test Meeting'
    };

    console.log('--- TEST RUN ---');
    const replaced = simulateReplacement(wf.body, testVariables);
    console.log('FINAL RESULT:', replaced);
    console.log('--- END TEST ---');
}

runTest().finally(() => prisma.$disconnect());
