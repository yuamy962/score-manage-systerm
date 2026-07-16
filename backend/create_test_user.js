const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const user = await prisma.user.create({
    data: {
      username: 'testapi',
      name: '测试API用户',
      password: hashedPassword,
      role: 'MEMBER',
    },
  });
  
  console.log('Created test user:', user);
  await prisma.$disconnect();
}

createTestUser().catch(console.error);
