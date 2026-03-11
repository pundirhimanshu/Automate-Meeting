const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBulkDelete() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found');
            return;
        }

        console.log(`Testing for user: ${user.email}`);

        // Create 2 test event types
        const et1 = await prisma.eventType.create({
            data: {
                title: 'Test Delete 1',
                slug: `test-delete-1-${Date.now()}`,
                userId: user.id,
                duration: 30
            }
        });
        const et2 = await prisma.eventType.create({
            data: {
                title: 'Test Delete 2',
                slug: `test-delete-2-${Date.now()}`,
                userId: user.id,
                duration: 30
            }
        });

        console.log(`Created test events: ${et1.id}, ${et2.id}`);

        // Simulate bulk delete
        const result = await prisma.eventType.deleteMany({
            where: {
                id: { in: [et1.id, et2.id] },
                userId: user.id
            }
        });

        console.log(`Deleted count: ${result.count}`);

        if (result.count === 2) {
            console.log('SUCCESS: Bulk delete logic verified.');
        } else {
            console.log('FAILURE: Bulk delete logic failed.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testBulkDelete();
