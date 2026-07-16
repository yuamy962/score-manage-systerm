const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const password = 'QH_hezuo_2026';
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: '超级管理员',
      username: 'sadmin',
      password: hashed,
      role: 'MANAGER',
      status: true,
    },
  });

  console.log('✅ 管理员账号创建成功！');
  console.log('   用户名: sadmin');
  console.log('   密码: QH_hezuo_2026');
}

main()
  .catch((e) => {
    if (e.code === 'P2002') {
      console.log('❌ 用户名 sadmin 已存在');
    } else {
      console.error('❌ 创建失败:', e.message);
    }
  })
  .finally(() => prisma.$disconnect());
