import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtensionStatus } from '@prisma/client';

@Injectable()
export class ExtensionsService {
  constructor(private prisma: PrismaService) {}

  async apply(userId: string, taskId: string, data: { reason: string; extendDays: number }) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('任务不存在');

    if (!task.actualStartAt) {
      throw new BadRequestException('任务尚未开始，无需申请延期');
    }

    if (task.planFinishAt && new Date() <= task.planFinishAt) {
      throw new BadRequestException('任务尚未到期，无需申请延期');
    }

    const penaltyConfig = await this.getPenaltyConfig();
    const month = new Date().toISOString().slice(0, 7);
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const monthExtensions = await this.prisma.taskExtension.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    if (monthExtensions >= penaltyConfig.monthlyExtLimit) {
      throw new BadRequestException(
        `本月延期申请已达上限(${penaltyConfig.monthlyExtLimit}次)`,
      );
    }

    const pendingExtension = await this.prisma.taskExtension.findFirst({
      where: { taskId, userId, status: ExtensionStatus.PENDING },
    });
    if (pendingExtension) {
      throw new BadRequestException('该任务已有待审批的延期申请');
    }

    const currentDeadline = task.planFinishAt || task.createdAt;
    const newDeadline = new Date(currentDeadline);
    newDeadline.setDate(newDeadline.getDate() + data.extendDays);

    return this.prisma.taskExtension.create({
      data: {
        taskId,
        userId,
        reason: data.reason,
        extendDays: data.extendDays,
        newDeadline,
        status: ExtensionStatus.PENDING,
      },
    });
  }

  async review(extensionId: string, reviewerId: string, approved: boolean, note?: string) {
    const extension = await this.prisma.taskExtension.findUnique({
      where: { id: extensionId },
    });
    if (!extension) throw new NotFoundException('延期申请不存在');
    if (extension.status !== ExtensionStatus.PENDING) {
      throw new BadRequestException('该申请已处理');
    }

    const updated = await this.prisma.taskExtension.update({
      where: { id: extensionId },
      data: {
        status: approved ? ExtensionStatus.APPROVED : ExtensionStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewNote: note,
        reviewedAt: new Date(),
      },
    });

    if (approved) {
      const task = await this.prisma.task.findUnique({
        where: { id: extension.taskId },
      });
      if (task && !task.originalPlanFinishAt && task.planFinishAt) {
        await this.prisma.task.update({
          where: { id: extension.taskId },
          data: {
            originalPlanFinishAt: task.planFinishAt,
            planFinishAt: extension.newDeadline,
          },
        });
      } else if (task) {
        await this.prisma.task.update({
          where: { id: extension.taskId },
          data: { planFinishAt: extension.newDeadline },
        });
      }
    }

    return updated;
  }

  async getTaskExtensions(taskId: string) {
    return this.prisma.taskExtension.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyExtensions(userId: string) {
    return this.prisma.taskExtension.findMany({
      where: { userId },
      include: {
        task: { select: { id: true, title: true, planFinishAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingExtensions(reviewerId: string) {
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
    });
    if (!reviewer) throw new NotFoundException('用户不存在');

    const where: any = { status: ExtensionStatus.PENDING };
    if (reviewer.role === 'PM') {
      where.task = { createdBy: reviewerId };
    }

    return this.prisma.taskExtension.findMany({
      where,
      include: {
        task: { select: { id: true, title: true, planFinishAt: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMonthlyExtensionCount(userId: string): Promise<{ used: number; limit: number }> {
    const penaltyConfig = await this.getPenaltyConfig();
    const month = new Date().toISOString().slice(0, 7);
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const used = await this.prisma.taskExtension.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });
    return { used, limit: penaltyConfig.monthlyExtLimit };
  }

  async getPenaltyConfig() {
    let config = await this.prisma.penaltyConfig.findFirst();
    if (!config) {
      config = await this.prisma.penaltyConfig.create({
        data: {
          dailyDecayRate: 0.9,
          minScoreRatio: 0.3,
          monthlyExtLimit: 3,
          updatedBy: 'system',
        },
      });
    }
    return config;
  }

  async updatePenaltyConfig(userId: string, data: { dailyDecayRate?: number; minScoreRatio?: number; monthlyExtLimit?: number }) {
    let config = await this.prisma.penaltyConfig.findFirst();
    if (!config) {
      config = await this.prisma.penaltyConfig.create({
        data: {
          dailyDecayRate: data.dailyDecayRate || 0.9,
          minScoreRatio: data.minScoreRatio || 0.3,
          monthlyExtLimit: data.monthlyExtLimit || 3,
          updatedBy: userId,
        },
      });
    } else {
      config = await this.prisma.penaltyConfig.update({
        where: { id: config.id },
        data: {
          ...data,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
    }
    return config;
  }

  calculatePenalty(baseScore: number, overdueDays: number, dailyDecayRate: number, minScoreRatio: number): number {
    if (overdueDays <= 0) return baseScore;
    const decayed = baseScore * Math.pow(dailyDecayRate, overdueDays);
    const minScore = baseScore * minScoreRatio;
    return Math.max(decayed, minScore);
  }
}
