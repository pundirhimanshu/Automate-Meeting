const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulation of the actual function logic in src/lib/workflow-engine.js
function simulateReplacement(body, variables) {
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Support both {{ }} and (( )) to be hyper-safe
    const pattern = /[\{\(]{2}\s*([^}\)]+)\s*[\}\)]{2}/gi;

    console.log('[DEBUG] Testing body replacement...');
    const result = body.replace(pattern, (match, p1) => {
        const rawKey = p1.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags
        const normalizedKey = normalize(rawKey);
        
        const matchKey = Object.keys(variables).find(k => normalize(k) === normalizedKey);
        
        if (matchKey) {
            console.log(`[DEBUG] Found match for {{${rawKey}}}. Replacing with value.`);
            return variables[matchKey];
        } else {
            console.log(`[DEBUG] No match found for {{${rawKey}}}. Keys checked: ${Object.keys(variables).join(', ')}`);
            return match;
        }
    });

    return result;
}

async function runTest() {
    const workflowId = '92960109-7a84-4c1e-92b4-29b438f575d7';
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

    console.log('--- ORIGINAL BODY ---');
    console.log(wf.body);
    console.log('---------------------');

    const replaced = simulateReplacement(wf.body, testVariables);

    console.log('--- REPLACED BODY ---');
    console.log(replaced);
    console.log('---------------------');
}

runTest().finally(() => prisma.$disconnect());
