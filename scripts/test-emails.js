const { prisma } = require('../src/lib/prisma');
const { sendBookingConfirmation } = require('../src/lib/email');
const { triggerWorkflows } = require('../src/lib/workflow-engine');

async function testConfirmation(bookingId) {
    console.log(`Starting manual confirmation for booking: ${bookingId}`);
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { eventType: true, host: true }
        });

        if (!booking) {
            console.error('Booking not found');
            return;
        }

        console.log('Found booking. Triggering emails...');
        
        await sendBookingConfirmation({
            booking,
            eventType: booking.eventType,
            host: booking.host,
            coHosts: [],
            inviteeName: booking.inviteeName,
            inviteeEmail: booking.inviteeEmail,
            startTime: booking.startTime,
            manageUrl: 'http://localhost:3000/manage/test',
            timezone: booking.timezone || 'UTC',
        });

        console.log('Emails sent! Triggering workflows...');
        await triggerWorkflows('EVENT_BOOKED', booking.id).catch(e => console.error('Workflow error:', e));
        
        console.log('Manual confirmation test complete!');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

// Get ID from args
const bookingId = process.argv[2];
if (!bookingId) {
    console.log('Usage: node scripts/test-emails.js <bookingId>');
    process.exit(1);
}

testConfirmation(bookingId);
