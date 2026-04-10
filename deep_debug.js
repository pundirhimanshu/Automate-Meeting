const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function run() {
  const workflow = await prisma.workflow.findUnique({
    where: { id: '92960109-7a84-4c1e-92b4-29b438f575d7' }
  });
  if (!workflow) {
    console.error('Workflow not found');
    return;
  }
  console.log('--- RAW BODY ---');
  console.log(workflow.body);
  console.log('--- HEX DUMP ---');
  console.log(Buffer.from(workflow.body).toString('hex').match(/.{1,2}/g).join(' '));
  fs.writeFileSync('raw_body_debug.txt', workflow.body);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
