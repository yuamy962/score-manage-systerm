import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueCategory } from '@prisma/client';

@Injectable()
export class IssuesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    title: string;
    description: string;
    systemModuleId?: string;
    occurredAt: Date;
    resolvedAt?: Date;
    hoursSpent: number;
    category: IssueCategory;
    remark?: string;
    createdBy: string;
  }) {
    return this.prisma.issue.create({
      data,
    });
  }

  async findAll(userId?: string) {
    const where = userId ? { createdBy: userId } : {};
    return this.prisma.issue.findMany({
      where,
      include: {
        systemModule: true,
        creator: true,
        issueScore: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.issue.findUnique({
      where: { id },
      include: {
        systemModule: true,
        creator: true,
      },
    });
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    systemModuleId?: string;
    occurredAt?: Date;
    resolvedAt?: Date;
    hoursSpent?: number;
    category?: IssueCategory;
    remark?: string;
  }) {
    return this.prisma.issue.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.issue.delete({
      where: { id },
    });
  }
}
