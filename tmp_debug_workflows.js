const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const workflows = await prisma.workflow.findMany({
    where: { isActive: true },
    include: { eventTypes: true }
  });
  console.log('ACTIVE WORKFLOWS:');
  workflows.forEach(w => {
    console.log(`ID: ${w.id}`);
    console.log(`Name: ${w.name}`);
    console.log(`Trigger: ${w.trigger}`);
    console.log(`Subject: ${w.subject}`);
    console.log(`Body: ${w.body}`);
    console.log('---');
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
