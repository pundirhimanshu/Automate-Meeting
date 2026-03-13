const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst();
        console.log('--- USER CHECK ---');
        if (user) {
            console.log('Found user ID:', user.id);
            console.log('Username:', user.username);
        } else {
            console.log('No users found in database.');
        }

        const forms = await prisma.routingForm.findMany();
        console.log('\n--- ROUTING FORMS ---');
        console.log('Count:', forms.length);
        forms.forEach(f => console.log(`- ${f.name} (ID: ${f.id}, UserID: ${f.userId}, Slug: ${f.slug})`));

    } catch (err) {
        console.error('Error during DB check:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
