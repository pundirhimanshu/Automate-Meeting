const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const bookings = await prisma.booking.findMany({
        include: {
            eventType: true,
            host: true
        }
    });
    console.log('TOTAL BOOKINGS:', bookings.length);
    bookings.forEach(b => {
        console.log(`ID: ${b.id}, Host: ${b.host.email}, Event: ${b.eventType.title}, Start: ${b.startTime}, Status: ${b.status}`);
    });

    const users = await prisma.user.findMany();
    console.log('\nTOTAL USERS:', users.length);
    users.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}, Name: ${u.name}`));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
