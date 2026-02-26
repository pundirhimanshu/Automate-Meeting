const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Clean existing data
    await prisma.bookingAnswer.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.customQuestion.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.dateOverride.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.eventType.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create demo user
    const user = await prisma.user.create({
        data: {
            name: 'Himanshu Pundir',
            email: 'himanshu@example.com',
            password: hashedPassword,
            username: 'himanshu-pundir',
            timezone: 'Asia/Kolkata',
            brandColor: '#0069ff',
        },
    });

    // Create default schedule with working hours
    const schedule = await prisma.schedule.create({
        data: {
            name: 'Working Hours',
            isDefault: true,
            userId: user.id,
            availabilities: {
                create: [
                    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
                    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
                    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
                ],
            },
        },
    });

    // Create event types matching the reference UI
    const eventType1 = await prisma.eventType.create({
        data: {
            title: 'New Meeting',
            slug: 'new-meeting-group',
            description: 'A group meeting for team collaboration',
            duration: 30,
            type: 'group',
            color: '#ff9500',
            location: 'No location set',
            userId: user.id,
        },
    });

    const eventType2 = await prisma.eventType.create({
        data: {
            title: 'New Meeting',
            slug: 'new-meeting',
            description: 'A one-on-one consultation',
            duration: 30,
            type: 'one-on-one',
            color: '#ff9500',
            userId: user.id,
        },
    });

    const eventType3 = await prisma.eventType.create({
        data: {
            title: '30 Minute Meeting',
            slug: '30-minute-meeting',
            description: 'A quick 30 minute catch-up',
            duration: 30,
            type: 'one-on-one',
            color: '#ff9500',
            userId: user.id,
        },
    });

    // Add custom questions to event type
    await prisma.customQuestion.create({
        data: {
            eventTypeId: eventType1.id,
            question: 'What would you like to discuss?',
            type: 'text',
            required: false,
            order: 0,
        },
    });

    // Create sample bookings
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setMinutes(tomorrowEnd.getMinutes() + 30);

    const booking1 = await prisma.booking.create({
        data: {
            eventTypeId: eventType2.id,
            hostId: user.id,
            inviteeName: 'John Doe',
            inviteeEmail: 'john@example.com',
            startTime: tomorrow,
            endTime: tomorrowEnd,
            status: 'confirmed',
            timezone: 'America/New_York',
            notes: 'Looking forward to our meeting!',
        },
    });

    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(14, 0, 0, 0);

    const dayAfterEnd = new Date(dayAfter);
    dayAfterEnd.setMinutes(dayAfterEnd.getMinutes() + 30);

    await prisma.booking.create({
        data: {
            eventTypeId: eventType3.id,
            hostId: user.id,
            inviteeName: 'Jane Smith',
            inviteeEmail: 'jane@example.com',
            startTime: dayAfter,
            endTime: dayAfterEnd,
            status: 'confirmed',
            timezone: 'Europe/London',
        },
    });

    // Past booking
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(15, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setMinutes(yesterdayEnd.getMinutes() + 30);

    await prisma.booking.create({
        data: {
            eventTypeId: eventType2.id,
            hostId: user.id,
            inviteeName: 'Bob Johnson',
            inviteeEmail: 'bob@example.com',
            startTime: yesterday,
            endTime: yesterdayEnd,
            status: 'completed',
            timezone: 'Asia/Kolkata',
        },
    });

    // Create notifications
    await prisma.notification.create({
        data: {
            userId: user.id,
            type: 'booking_confirmed',
            title: 'New Booking',
            message: `John Doe booked "New Meeting" for ${tomorrow.toLocaleDateString()}`,
            bookingId: booking1.id,
        },
    });

    console.log('✅ Database seeded successfully!');
    console.log(`   User: ${user.email} / password123`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Event Types: ${3}`);
    console.log(`   Bookings: ${3}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
