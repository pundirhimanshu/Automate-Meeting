const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const forms = await prisma.routingForm.findMany({
      include: { _count: { select: { submissions: true } } }
    });
    console.log('--- FORMS ---');
    forms.forEach(f => {
      console.log(`ID: ${f.id} | Name: ${f.name} | Subs: ${f._count.submissions}`);
    });

    const subs = await prisma.routingSubmission.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' }
    });
    console.log('\n--- RECENT SUBMISSIONS ---');
    console.log(JSON.stringify(subs, null, 2));

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
