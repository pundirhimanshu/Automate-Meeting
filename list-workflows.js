const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const workflows = await prisma.workflow.findMany({
    select: { id: true, name: true, body: true, trigger: true }
  });
  console.log('--- ALL WORKFLOWS ---');
  workflows.forEach(w => {
    console.log(`[ID: ${w.id}] [NAME: ${w.name}] [TRIGGER: ${w.trigger}]`);
    console.log(`BODY: ${w.body}`);
    console.log('---');
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
