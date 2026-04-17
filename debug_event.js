const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ev = await prisma.eventType.findFirst({
    where: { slug: 'ggggg' }
  });
  console.log('EVENT_TYPE_DATA:', JSON.stringify(ev, null, 2));

  if (ev) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const bookings = await prisma.booking.count({
        where: {
            eventTypeId: ev.id,
            startTime: { gte: today },
            status: { in: ['confirmed', 'pending', 'rescheduled'] }
        }
    });
    console.log('TODAY_BOOKINGS_COUNT:', bookings);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
