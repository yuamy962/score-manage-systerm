import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: string;
    ip?: string;
  }) {
    try {
      await this.prisma.operationLog.create({ data: params });
    } catch {
      // audit log failure should not break business flow
    }
  }

  async findAll(options: { userId?: string; action?: string; resource?: string; page?: number; pageSize?: number }) {
    const { userId, action, resource, page = 1, pageSize = 50 } = options;
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };
    if (resource) where.resource = { contains: resource };

    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
