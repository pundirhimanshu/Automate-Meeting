const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const bookings = await prisma.booking.findMany();
    const now = new Date();
    console.log('--- TIME INFO ---');
    console.log('Server Now (Local):', now.toString());
    console.log('Server Now (ISO):  ', now.toISOString());

    bookings.forEach(b => {
        console.log(`Booking ID: ${b.id}`);
        console.log(`  Local String: ${b.startTime.toString()}`);
        console.log(`  ISO String:   ${b.startTime.toISOString()}`);
        console.log(`  Is Future:    ${b.startTime > now}`);
    });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
