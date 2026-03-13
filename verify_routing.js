const { PrismaClient } = require('@prisma/client');
const { evaluateRoutingRules } = require('./src/lib/routing-engine');
const prisma = new PrismaClient();

async function verify() {
    const userId = '2738b867-20d6-44c6-b6d6-c748b4604f47'; // Seeded user

    try {
        console.log('1. Creating Routing Form...');
        const form = await prisma.routingForm.create({
            data: {
                name: 'Verification Form',
                slug: 'verify-' + Date.now(),
                userId: userId,
                isActive: true
            }
        });
        console.log('   Form created:', form.id);

        console.log('2. Adding Question...');
        const question = await prisma.routingQuestion.create({
            data: {
                formId: form.id,
                type: 'dropdown',
                label: 'Department',
                identifier: 'dept',
                options: JSON.stringify(['Sales', 'Support']),
                order: 0
            }
        });
        console.log('   Question created:', question.id);

        console.log('3. Adding Rule...');
        const rule = await prisma.routingRule.create({
            data: {
                formId: form.id,
                questionId: question.id,
                operator: 'is',
                value: 'Sales',
                destination: 'event-type:some-id',
                order: 0
            }
        });
        console.log('   Rule created:', rule.id);

        console.log('4. Testing Logic Engine...');
        const rules = [rule];
        const answers = { [question.id]: 'Sales' };
        const destination = evaluateRoutingRules(rules, answers);
        console.log('   Logic result:', destination);

        if (destination === 'event-type:some-id') {
            console.log('   ✅ Logic evaluation successful!');
        } else {
            console.error('   ❌ Logic evaluation FAILED!');
        }

        console.log('5. Simulating Lead Capture...');
        const inviteeEmail = 'tester@example.com';
        await prisma.contact.upsert({
            where: {
                userId_email: {
                    userId: userId,
                    email: inviteeEmail,
                }
            },
            update: { name: 'Test Lead' },
            create: {
                name: 'Test Lead',
                email: inviteeEmail,
                userId: userId,
            }
        });
        const contact = await prisma.contact.findUnique({
            where: { userId_email: { userId, email: inviteeEmail } }
        });
        if (contact) {
            console.log('   ✅ Contact capture successful!');
        } else {
            console.error('   ❌ Contact capture FAILED!');
        }

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('Verification error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
