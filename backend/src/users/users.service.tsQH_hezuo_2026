import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        phone: true,
        openid: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(operatorId: string, data: {
    name: string;
    username: string;
    password: string;
    role: Role;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { ...data, password: hashed },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    await this.audit.log({
      userId: operatorId,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: user.id,
      detail: `创建用户 ${user.username} (${user.role})`,
    });
    return user;
  }

  async update(operatorId: string, id: string, data: Partial<{
    name: string;
    role: Role;
    status: boolean;
    phone: string;
  }>) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        phone: true,
        updatedAt: true,
      },
    });
    await this.audit.log({
      userId: operatorId,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: id,
      detail: `更新用户 ${user.username}: ${JSON.stringify(data)}`,
    });
    return user;
  }

  async resetPassword(operatorId: string, id: string, newPassword: string) {
    await this.findOne(id);
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
      select: { id: true, updatedAt: true },
    });
    await this.audit.log({
      userId: operatorId,
      action: 'RESET_PASSWORD',
      resource: 'user',
      resourceId: id,
      detail: '重置用户密码',
    });
    return { message: '密码重置成功' };
  }
}
