const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSync() {
  const formId = 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8'; // Placeholder, will find real one
  
  try {
    // 1. Find a form
    const form = await prisma.routingForm.findFirst();
    if (!form) {
      console.log('No form found');
      return;
    }
    const fid = form.id;
    console.log(`Testing with Form ID: ${fid}`);

    // 2. Add two test questions
    const q1 = await prisma.routingQuestion.create({
      data: { formId: fid, label: 'Test Delete Me', type: 'text', identifier: 'delete_me' }
    });
    const q2 = await prisma.routingQuestion.create({
      data: { formId: fid, label: 'Test Keep Me', type: 'text', identifier: 'keep_me' }
    });
    console.log('Created two test questions.');

    // 3. Simulate a PUT request that keeps only q2
    // We send q2 and a new temp question
    const incomingData = [
      { id: q2.id, label: 'Updated Keep Me', type: 'text', identifier: 'keep_me', order: 0 },
      { id: 'temp-12345', label: 'New Question', type: 'text', identifier: 'new_q', order: 1 }
    ];

    console.log('--- SIMULATING PUT ---');
    const existingQuestions = await prisma.routingQuestion.findMany({ where: { formId: fid } });
    const existingIds = existingQuestions.map(q => q.id);
    const incomingIds = incomingData.filter(q => q.id && !q.id.startsWith('temp-')).map(q => q.id);
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    
    console.log('Existing IDs:', existingIds);
    console.log('Incoming IDs:', incomingIds);
    console.log('IDs to Delete:', idsToDelete);

    await prisma.$transaction(async (tx) => {
      if (idsToDelete.length > 0) {
        await tx.routingQuestion.deleteMany({ where: { id: { in: idsToDelete } } });
      }
      for (const q of incomingData) {
        if (!q.id || q.id.startsWith('temp-')) {
          await tx.routingQuestion.create({ 
            data: { formId: fid, label: q.label, type: q.type, identifier: q.identifier, order: q.order } 
          });
        } else {
          await tx.routingQuestion.update({ where: { id: q.id }, data: { label: q.label, order: q.order } });
        }
      }
    });
    console.log('Transaction complete.');

    // 4. Verify results
    const finalQuestions = await prisma.routingQuestion.findMany({ where: { formId: fid } });
    console.log('--- FINAL STATE ---');
    finalQuestions.forEach(q => console.log(`- ${q.label} (ID: ${q.id})`));

    const foundDeleted = finalQuestions.find(q => q.id === q1.id);
    if (!foundDeleted) {
      console.log('SUCCESS: "Test Delete Me" was correctly removed.');
    } else {
      console.log('FAILED: "Test Delete Me" still exists!');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
