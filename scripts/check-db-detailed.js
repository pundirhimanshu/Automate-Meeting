const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    const invitations = await prisma.invitation.findMany();
    const bookings = await prisma.booking.findMany({
        include: {
            host: true,
            eventType: {
                include: {
                    coHosts: true
                }
            }
        }
    });

    console.log('--- USERS ---');
    users.forEach(u => console.log(`${u.id}: ${u.email} (${u.name})`));

    console.log('\n--- INVITATIONS ---');
    invitations.forEach(i => console.log(`${i.email} -> ${i.teamId} (${i.status})`));

    console.log('\n--- BOOKINGS ---');
    bookings.forEach(b => {
        const coHosts = b.eventType.coHosts.map(ch => ch.email).join(', ');
        console.log(`ID: ${b.id}, HostID: ${b.hostId}, HostEmail: ${b.host.email}, Start: ${b.startTime}, Co-hosts: [${coHosts}]`);
    });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
