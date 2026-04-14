const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const bookings = await prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { eventType: true }
    });
    
    console.log('--- LATEST BOOKINGS ---');
    bookings.forEach(b => {
        console.log(`ID: ${b.id} | Status: ${b.status} | Provider: ${b.eventType.paymentProvider} | Created: ${b.createdAt}`);
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
