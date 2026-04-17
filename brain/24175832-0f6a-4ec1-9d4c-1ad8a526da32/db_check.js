const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ev = await prisma.eventType.findFirst({
    where: { slug: 'ggggg' }
  });
  console.log('EVENT_DETAILS:', JSON.stringify(ev, null, 2));
}

check().catch(console.error);
