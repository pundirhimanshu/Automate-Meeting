const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDuplicates() {
  try {
    console.log('Searching for duplicate contacts...');
    const duplicates = await prisma.$queryRaw`
      SELECT "userId", "email", COUNT(*) as count
      FROM "Contact"
      GROUP BY "userId", "email"
      HAVING COUNT(*) > 1
    `;
    
    console.log('Duplicate sets found:', duplicates.length);
    for (const dup of duplicates) {
      console.log(`- User: ${dup.userId}, Email: ${dup.email}, Count: ${dup.count}`);
    }
  } catch (error) {
    console.error('Error finding duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDuplicates();
