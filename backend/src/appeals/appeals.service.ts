import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, AppealStatus } from '@prisma/client';

@Injectable()
export class AppealsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: Role) {
    const where = role === Role.MANAGER
      ? {}
      : role === Role.PM
      ? { status: { in: ['PENDING', 'REVIEWING'] as const } }
      : { userId };
    return this.prisma.appeal.findMany({
      where: where as any,
      include: {
        scoreRecord: {
          include: { user: { select: { id: true, name: true } } },
        },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: {
    scoreRecordId: string;
    reason: string;
    evidence?: string;
  }) {
    const record = await this.prisma.scoreRecord.findUnique({
      where: { id: data.scoreRecordId },
    });
    if (!record) throw new NotFoundException('积分记录不存在');
    if (record.userId !== userId) {
      throw new ForbiddenException('只能对自己的积分记录发起申诉');
    }

    return this.prisma.appeal.create({
      data: {
        scoreRecordId: data.scoreRecordId,
        userId,
        reason: data.reason,
        evidence: data.evidence,
        status: 'PENDING',
      },
    });
  }

  async review(id: string, reviewerId: string, role: Role, data: {
    status: AppealStatus;
    pmOpinion?: string;
    result?: string;
  }) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id },
    });
    if (!appeal) throw new NotFoundException('申诉记录不存在');

    if (role === Role.PM) {
      // 项目经理初审
      if (appeal.status !== 'PENDING') {
        throw new ForbiddenException('该申诉不在待处理状态');
      }
      return this.prisma.appeal.update({
        where: { id },
        data: {
          status: 'REVIEWING',
          pmOpinion: data.pmOpinion,
        },
      });
    }

    if (role === Role.MANAGER) {
      // 部门经理终审
      if (appeal.status !== 'REVIEWING') {
        throw new ForbiddenException('该申诉不在复核中状态');
      }
      return this.prisma.appeal.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          reviewerId,
          result: data.result,
          resolvedAt: new Date(),
        },
      });
    }

    throw new ForbiddenException('无权处理申诉');
  }
}
