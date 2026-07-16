import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始初始化数据...');

  const managerPassword = await bcrypt.hash('admin123', 10);
  const manager = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: '部门经理',
      username: 'admin',
      password: managerPassword,
      role: Role.MANAGER,
      status: true,
    },
  });
  console.log('✅ 部门经理账号:', manager.username, '/ admin123');

  const pmPassword = await bcrypt.hash('pm123', 10);
  const pm = await prisma.user.upsert({
    where: { username: 'pm01' },
    update: {},
    create: {
      name: '项目经理一号',
      username: 'pm01',
      password: pmPassword,
      role: Role.PM,
      status: true,
    },
  });
  console.log('✅ 项目经理账号:', pm.username, '/ pm123');

  const memberPassword = await bcrypt.hash('member123', 10);
  const member = await prisma.user.upsert({
    where: { username: 'member01' },
    update: {},
    create: {
      name: '普通成员一号',
      username: 'member01',
      password: memberPassword,
      role: Role.MEMBER,
      status: true,
    },
  });
  console.log('✅ 普通成员账号:', member.username, '/ member123');

  const performanceConfigs = [
    { grade: 'A', minScore: 180 },
    { grade: 'B+', minScore: 135 },
    { grade: 'B', minScore: 115 },
    { grade: 'C', minScore: 77 },
  ];

  for (const config of performanceConfigs) {
    await prisma.performanceConfig.upsert({
      where: { grade: config.grade },
      update: { minScore: config.minScore, updatedBy: manager.id },
      create: { ...config, updatedBy: manager.id },
    });
  }
  console.log('✅ 绩效配置已初始化');

  const member2 = await prisma.user.upsert({
    where: { username: 'member02' },
    update: {},
    create: {
      name: '普通成员二号',
      username: 'member02',
      password: await bcrypt.hash('member123', 10),
      role: Role.MEMBER,
      status: true,
    },
  });
  console.log('✅ 普通成员二号账号:', member2.username, '/ member123');

  const member3 = await prisma.user.upsert({
    where: { username: 'member03' },
    update: {},
    create: {
      name: '普通成员三号',
      username: 'member03',
      password: await bcrypt.hash('member123', 10),
      role: Role.MEMBER,
      status: true,
    },
  });
  console.log('✅ 普通成员三号账号:', member3.username, '/ member123');

  const member4 = await prisma.user.upsert({
    where: { username: 'member04' },
    update: {},
    create: {
      name: '普通成员四号',
      username: 'member04',
      password: await bcrypt.hash('member123', 10),
      role: Role.MEMBER,
      status: true,
    },
  });
  console.log('✅ 普通成员四号账号:', member4.username, '/ member123');

  const pm2 = await prisma.user.upsert({
    where: { username: 'pm02' },
    update: {},
    create: {
      name: '项目经理二号',
      username: 'pm02',
      password: await bcrypt.hash('pm123', 10),
      role: Role.PM,
      status: true,
    },
  });
  console.log('✅ 项目经理二号账号:', pm2.username, '/ pm123');

  const pm3 = await prisma.user.upsert({
    where: { username: 'pm03' },
    update: {},
    create: {
      name: '项目经理三号',
      username: 'pm03',
      password: await bcrypt.hash('pm123', 10),
      role: Role.PM,
      status: true,
    },
  });
  console.log('✅ 项目经理三号账号:', pm3.username, '/ pm123');

  console.log('🎉 数据初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
