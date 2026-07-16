import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ExtensionsService } from '../extensions/extensions.service';
import { ConfigService } from '../config/config.service';
import { Role, TaskStatus, ScoreType, TaskAction } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private extensionsService: ExtensionsService,
    private configService: ConfigService,
  ) {}

  async findAll(
    userId: string,
    role: Role,
    targetUserId?: string,
    filters?: {
      assigneeId?: string;
      creatorId?: string;
      status?: TaskStatus;
      planFinishStart?: string;
      planFinishEnd?: string;
    },
  ) {
    const whereConditions: any = {};

    if (filters?.assigneeId) {
      whereConditions.OR = whereConditions.OR || [];
      whereConditions.OR.push(
        { assignments: { some: { userId: filters.assigneeId } } },
        { claimedBy: filters.assigneeId },
      );
    }

    if (filters?.creatorId) {
      whereConditions.createdBy = filters.creatorId;
    }

    if (filters?.status) {
      whereConditions.status = filters.status;
    }

    if (filters?.planFinishStart || filters?.planFinishEnd) {
      whereConditions.planFinishAt = {};
      if (filters.planFinishStart) {
        whereConditions.planFinishAt.gte = new Date(`${filters.planFinishStart}T00:00:00`);
      }
      if (filters.planFinishEnd) {
        whereConditions.planFinishAt.lte = new Date(`${filters.planFinishEnd}T23:59:59`);
      }
    }

    if (targetUserId && role !== Role.MEMBER) {
      const targetConditions = {
        OR: [
          { assignments: { some: { userId: targetUserId } } },
          { claimedBy: targetUserId },
          { createdBy: targetUserId },
        ],
      };
      return this.prisma.task.findMany({
        where: { ...whereConditions, ...targetConditions },
        include: {
          assignments: { include: { user: { select: { id: true, name: true } } } },
          creator: { select: { id: true, name: true } },
          claimedUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === Role.MANAGER) {
      return this.prisma.task.findMany({
        where: whereConditions,
        include: {
          assignments: { include: { user: { select: { id: true, name: true } } } },
          creator: { select: { id: true, name: true } },
          claimedUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === Role.PM) {
      return this.prisma.task.findMany({
        where: whereConditions,
        include: {
          assignments: { include: { user: { select: { id: true, name: true, role: true } } } },
          creator: { select: { id: true, name: true, role: true } },
          claimedUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const memberConditions = {
      OR: [
        { assignments: { some: { userId } } },
        { claimedBy: userId },
        { isPoolTask: true, status: TaskStatus.POOL },
      ],
    };

    return this.prisma.task.findMany({
      where: { ...whereConditions, ...memberConditions },
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } },
        claimedUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPoolTasks() {
    return this.prisma.task.findMany({
      where: { isPoolTask: true, status: TaskStatus.POOL },
      include: {
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } },
        claimedUser: { select: { id: true, name: true } },
        scoreRecords: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!task) throw new NotFoundException('任务不存在');

    const isCreator = task.createdBy === userId;
    const isAssigned = task.assignments.some(a => a.userId === userId);
    const isClaimer = task.claimedBy === userId;
    if (role !== Role.MANAGER && !isCreator && !isAssigned && !isClaimer && !task.isPoolTask) {
      throw new ForbiddenException('无权查看此任务');
    }
    return task;
  }

  async create(userId: string, data: {
    title: string;
    description?: string;
    estimatedDays: number;
    taskType?: string;
    taskSource?: string;
    sourceNo?: string;
    sourceName?: string;
    taskAction?: string;
    scoreRatio?: number;
    planFinishAt?: string;
    isPoolTask?: boolean;
    claimRatio?: number;
    systemModuleId?: string;
    assignees?: { userId: string; ratio: number }[];
  }) {
    let scoreRatio = data.scoreRatio;
    if (scoreRatio === undefined || scoreRatio === null) {
      scoreRatio = data.taskAction === 'NON_SELF_DEV' ? 0.60 : 1.00;
    }

    const isPool = data.isPoolTask === true;

    if (isPool) {
      const claimRatio = data.claimRatio ?? 1.0;
      if (claimRatio <= 0 || claimRatio > 1) {
        throw new ForbiddenException('贡献比例必须在 0-1 之间');
      }

      return this.prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          estimatedDays: data.estimatedDays,
          finalDays: data.estimatedDays,
          taskType: data.taskType as any || 'REQUIREMENT_DEV',
          taskSource: data.taskSource as any || 'OTHER',
          sourceNo: data.sourceNo || null,
          sourceName: data.sourceName || null,
          taskAction: data.taskAction as any || 'SELF_DEV',
          scoreRatio,
          planFinishAt: data.planFinishAt ? new Date(data.planFinishAt) : null,
          createdBy: userId,
          status: TaskStatus.POOL,
          isPoolTask: true,
          claimRatio,
          systemModuleId: data.systemModuleId || null,
        },
        include: {
          assignments: { include: { user: { select: { id: true, name: true } } } },
          creator: { select: { id: true, name: true } },
        },
      });
    }

    if (!data.assignees || data.assignees.length === 0) {
      throw new ForbiddenException('非任务池任务必须指定负责人');
    }
    const totalRatio = data.assignees.reduce((sum, a) => sum + a.ratio, 0);
    if (Math.abs(totalRatio - 1) > 0.01) {
      throw new ForbiddenException('贡献比例总和必须为 1');
    }

    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        estimatedDays: data.estimatedDays,
        finalDays: data.estimatedDays,
        taskType: data.taskType as any || 'REQUIREMENT_DEV',
        taskSource: data.taskSource as any || 'OTHER',
        sourceNo: data.sourceNo || null,
        sourceName: data.sourceName || null,
        taskAction: data.taskAction as any || 'SELF_DEV',
        scoreRatio,
        planFinishAt: data.planFinishAt ? new Date(data.planFinishAt) : null,
        createdBy: userId,
        status: 'PENDING' as TaskStatus,
        systemModuleId: data.systemModuleId || null,
        assignments: {
          create: data.assignees.map(a => ({
            userId: a.userId,
            ratio: a.ratio,
          })),
        },
      },
      include: {
        assignments: { include: { user: { select: { id: true, name: true, phone: true } } } },
        creator: { select: { id: true, name: true } },
      },
    });

    const assigneePhones = task.assignments.map((a: any) => a.user?.phone).filter(Boolean);
    if (assigneePhones.length > 0) {
      this.notificationService.notifyTaskAssigned(task, assigneePhones).catch(err => {
        console.error('任务下发通知发送失败:', err);
      });
    }

    return task;
  }

  async claimTask(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');
    if (!task.isPoolTask) throw new ForbiddenException('该任务不是任务池任务');
    if (task.status !== TaskStatus.POOL) throw new ForbiddenException('该任务当前不可领取');
    if (task.claimedBy) throw new ForbiddenException('该任务已被领取');

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.CLAIMED,
        claimedBy: userId,
      },
      include: {
        creator: { select: { id: true, name: true } },
        claimedUser: { select: { id: true, name: true } },
      },
    });
  }

  async approveClaim(id: string, pmId: string, data?: { ratio?: number; addAssignees?: { userId: string; ratio: number }[] }) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== TaskStatus.CLAIMED) throw new ForbiddenException('该任务不在待确认领取状态');
    if (task.createdBy !== pmId && (await this.prisma.user.findUnique({ where: { id: pmId } }))?.role !== Role.MANAGER) {
      throw new ForbiddenException('只有创建该任务的项目经理或部门经理可以确认领取');
    }

    const claimerId = task.claimedBy;
    if (!claimerId) throw new ForbiddenException('领取人信息缺失');

    const claimerRatio = data?.ratio ?? task.claimRatio ?? 1.0;

    const assigneesData: { userId: string; ratio: number }[] = [
      { userId: claimerId, ratio: claimerRatio },
    ];

    if (data?.addAssignees && data.addAssignees.length > 0) {
      assigneesData.push(...data.addAssignees);
    }

    const totalRatio = assigneesData.reduce((sum, a) => sum + a.ratio, 0);
    if (Math.abs(totalRatio - 1) > 0.01) {
      throw new ForbiddenException(`贡献比例总和必须为 1，当前总和为 ${totalRatio.toFixed(2)}`);
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.PENDING,
        claimedBy: null,
        claimRatio: null,
        assignments: {
          create: assigneesData.map(a => ({ userId: a.userId, ratio: a.ratio })),
        },
      },
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async rejectClaim(id: string, pmId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== TaskStatus.CLAIMED) throw new ForbiddenException('该任务不在待确认领取状态');
    if (task.createdBy !== pmId && (await this.prisma.user.findUnique({ where: { id: pmId } }))?.role !== Role.MANAGER) {
      throw new ForbiddenException('只有创建该任务的项目经理或部门经理可以驳回领取');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.POOL,
        claimedBy: null,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async cancelClaim(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== TaskStatus.CLAIMED) throw new ForbiddenException('该任务不在待确认领取状态');
    if (task.claimedBy !== userId) throw new ForbiddenException('只有领取人可以取消领取');

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.POOL,
        claimedBy: null,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async returnToPool(id: string, userId: string, role: Role) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!task) throw new NotFoundException('任务不存在');
    if (!task.isPoolTask) throw new ForbiddenException('该任务不是任务池任务');
    if (task.status !== TaskStatus.PENDING) throw new ForbiddenException('只有待执行状态的任务可以退回任务池');
    if (task.actualStartAt) throw new ForbiddenException('已开始执行的任务不能退回任务池');

    const isAssignee = task.assignments.some(a => a.userId === userId);
    const isCreator = task.createdBy === userId;
    if (!isAssignee && !isCreator && role !== Role.MANAGER) {
      throw new ForbiddenException('无权退回此任务');
    }

    await this.prisma.taskAssignment.deleteMany({ where: { taskId: id } });

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.POOL,
        claimedBy: null,
        claimRatio: task.claimRatio,
        actualStartAt: null,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: string, userId: string, role: Role, status: TaskStatus, finalDays?: number) {
    const task = await this.findOne(id, userId, role);

    const validTransitions: Record<string, string[]> = {
      POOL: ['CANCELLED'],
      CLAIMED: ['POOL', 'CANCELLED'],
      DRAFT: ['PENDING', 'CANCELLED'],
      PENDING: ['IN_PROGRESS', 'CANCELLED', 'POOL'],
      IN_PROGRESS: ['IN_REVIEW', 'CANCELLED'],
      IN_REVIEW: ['COMPLETED', 'REJECTED'],
      REJECTED: ['IN_PROGRESS', 'CANCELLED'],
    };

    const current = task.status;
    const currentStr = current as string;
    if (!validTransitions[currentStr]?.includes(status as string)) {
      throw new ForbiddenException(`不允许从 ${current} 转为 ${status}`);
    }

    if (status === TaskStatus.POOL && task.isPoolTask && current === TaskStatus.PENDING) {
      return this.returnToPool(id, userId, role);
    }

    const updateData: any = { status };

    if (current === TaskStatus.PENDING && status === TaskStatus.IN_PROGRESS) {
      updateData.actualStartAt = new Date();
      if (task.planFinishAt && !task.originalPlanFinishAt) {
        updateData.originalPlanFinishAt = task.planFinishAt;
      }
    }

    if (current === TaskStatus.IN_PROGRESS && status === TaskStatus.IN_REVIEW) {
      updateData.actualFinishAt = new Date();
      if (finalDays !== undefined && finalDays !== null) {
        updateData.finalDays = finalDays;
      }
    }

    if (current === TaskStatus.IN_REVIEW && status === TaskStatus.REJECTED) {
      updateData.actualFinishAt = null;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (current === TaskStatus.IN_PROGRESS && status === TaskStatus.IN_REVIEW) {
      this.notificationService.notifyTaskSubmitted(updatedTask).catch(() => {});
    }

    return updatedTask;
  }

  async update(
    id: string,
    userId: string,
    role: Role,
    data: {
      title?: string;
      description?: string;
      estimatedDays?: number;
      finalDays?: number;
      taskType?: string;
      taskSource?: string;
      sourceNo?: string;
      sourceName?: string;
      taskAction?: string;
      scoreRatio?: number;
      planFinishAt?: string;
      systemModuleId?: string;
      assignees?: { userId: string; ratio: number }[];
    },
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!task) throw new NotFoundException('任务不存在');

    const isCreator = task.createdBy === userId;
    if (!isCreator && role !== Role.MANAGER) {
      throw new ForbiddenException('无权编辑此任务');
    }

    if (!['DRAFT', 'PENDING', 'POOL'].includes(task.status)) {
      throw new ForbiddenException('只有草稿、待执行或任务池状态的任务可以编辑');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.estimatedDays !== undefined) {
      updateData.estimatedDays = data.estimatedDays;
      if (data.finalDays === undefined) {
        updateData.finalDays = data.estimatedDays;
      }
    }
    if (data.finalDays !== undefined) updateData.finalDays = data.finalDays;
    if (data.taskType !== undefined) updateData.taskType = data.taskType;
    if (data.taskSource !== undefined) updateData.taskSource = data.taskSource;
    if (data.sourceNo !== undefined) updateData.sourceNo = data.sourceNo || null;
    if (data.sourceName !== undefined) updateData.sourceName = data.sourceName || null;
    if (data.taskAction !== undefined) updateData.taskAction = data.taskAction;
    if (data.scoreRatio !== undefined) updateData.scoreRatio = data.scoreRatio;
    if (data.planFinishAt !== undefined) {
      if (task.actualStartAt) {
        throw new ForbiddenException('任务已开始，截止日期不可修改，请通过延期申请调整');
      }
      updateData.planFinishAt = data.planFinishAt ? new Date(data.planFinishAt) : null;
    }
    if (data.systemModuleId !== undefined) updateData.systemModuleId = data.systemModuleId || null;

    if (task.isPoolTask && task.status === TaskStatus.POOL) {
      // 任务池任务编辑不需要 assignees
    } else if (data.assignees && data.assignees.length > 0) {
      const totalRatio = data.assignees.reduce((sum, a) => sum + a.ratio, 0);
      if (Math.abs(totalRatio - 1) > 0.01) {
        throw new ForbiddenException('贡献比例总和必须为 1');
      }

      await this.prisma.taskAssignment.deleteMany({ where: { taskId: id } });
      updateData.assignments = {
        create: data.assignees.map((a) => ({
          userId: a.userId,
          ratio: a.ratio,
        })),
      };
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async deleteTask(id: string, userId: string, role: Role) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignments: true, scoreRecords: true },
    });
    if (!task) throw new NotFoundException('任务不存在');

    const isCreator = task.createdBy === userId;
    if (!isCreator && role !== Role.MANAGER) {
      throw new ForbiddenException('无权删除此任务');
    }

    if (!['DRAFT', 'PENDING', 'POOL', 'CLAIMED'].includes(task.status)) {
      throw new ForbiddenException('只有未开始的任务可以删除');
    }

    if (task.scoreRecords.length > 0) {
      throw new ForbiddenException('该任务已产生积分记录，不可删除');
    }

    await this.prisma.$transaction([
      this.prisma.taskAssignment.deleteMany({ where: { taskId: id } }),
      this.prisma.taskExtension.deleteMany({ where: { taskId: id } }),
      this.prisma.task.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  async approveTask(id: string, pmId: string, finalDays?: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignments: { include: { user: { select: { id: true, role: true } } } },
        creator: true,
      },
    });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.createdBy !== pmId && (await this.prisma.user.findUnique({ where: { id: pmId } }))?.role !== Role.MANAGER) {
      throw new ForbiddenException('只有创建该任务的项目经理或部门经理可以审核');
    }
    if (task.status !== 'IN_REVIEW') {
      throw new ForbiddenException('任务不在待审核状态');
    }

    const now = new Date();
    const effectMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const workDays = finalDays !== undefined && finalDays !== null ? finalDays : (task.finalDays || task.estimatedDays);

    const scoreRecords = [];
    const penaltyConfig = await this.extensionsService.getPenaltyConfig();
    const hasApprovedExtension = await this.prisma.taskExtension.findFirst({
      where: { taskId: id, status: 'APPROVED' },
    });

    const creatorRole = task.creator.role;
    const isManagerTask = creatorRole === Role.MANAGER;
    let totalMemberScore = 0;

    for (const assignment of task.assignments) {
      const userScore = workDays * assignment.ratio * task.scoreRatio;

      if (userScore > 0) {
        // PM 只有完成部门经理分配的任务时才获得个人积分
        const isPmAssignee = assignment.user.role === Role.PM;
        if (isPmAssignee && !isManagerTask) {
          continue;
        }

        const scoreType: ScoreType = task.taskType === 'OPS_SUPPORT' ? ScoreType.OPS : ScoreType.REQUIREMENT;

        let finalScore = userScore;
        let penaltyNote = '';

        if (!hasApprovedExtension && task.planFinishAt && task.actualFinishAt) {
          const finishDate = new Date(task.actualFinishAt);
          const deadline = new Date(task.planFinishAt);
          deadline.setHours(23, 59, 59, 999);

          if (finishDate > deadline) {
            const overdueMs = finishDate.getTime() - deadline.getTime();
            const overdueDays = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
            if (overdueDays > 0) {
              finalScore = this.extensionsService.calculatePenalty(
                userScore,
                overdueDays,
                penaltyConfig.dailyDecayRate,
                penaltyConfig.minScoreRatio,
              );
              finalScore = Math.round(finalScore * 100) / 100;
              penaltyNote = `（延期${overdueDays}天，扣罚后积分，原始${userScore.toFixed(2)}分 × ${penaltyConfig.dailyDecayRate}^${overdueDays}）`;
            }
          }
        }

        totalMemberScore += finalScore;

        scoreRecords.push({
          userId: assignment.userId,
          taskId: id,
          type: scoreType,
          score: finalScore,
          reason: `任务【${task.title}】完成，贡献比例 ${(assignment.ratio * 100).toFixed(0)}%，积分转换比例 ${(task.scoreRatio * 100).toFixed(0)}%，最终工作量 ${workDays} 人日${penaltyNote}`,
          sourceType: task.taskSource || 'OTHER',
          sourceNo: task.taskSource === 'REQUIREMENT' ? (task.sourceNo || null) : null,
          sourceName: task.taskSource === 'PROJECT' ? (task.sourceName || null) : null,
          createdBy: pmId,
          approvedBy: pmId,
          approvedAt: now,
          effectMonth,
        });
      }
    }

    // PM 创建的任务，发放管理分成
    if (creatorRole === Role.PM && totalMemberScore > 0) {
      const taskConfig = await this.configService.getTaskConfig();
      const pmBonusRatio = taskConfig.pmBonusRatio || 0.10;
      const pmBonusScore = Math.round(totalMemberScore * pmBonusRatio * 100) / 100;

      scoreRecords.push({
        userId: task.createdBy,
        taskId: id,
        type: ScoreType.PM_BONUS,
        score: pmBonusScore,
        reason: `任务【${task.title}】管理分成，任务总积分 ${totalMemberScore.toFixed(2)}，分成比例 ${(pmBonusRatio * 100).toFixed(0)}%`,
        sourceType: task.taskSource || 'OTHER',
        sourceNo: task.taskSource === 'REQUIREMENT' ? (task.sourceNo || null) : null,
        sourceName: task.taskSource === 'PROJECT' ? (task.sourceName || null) : null,
        createdBy: pmId,
        approvedBy: pmId,
        approvedAt: now,
        effectMonth,
      });
    }

    const updateTaskData: any = { status: TaskStatus.COMPLETED, actualFinishAt: now };
    if (finalDays !== undefined && finalDays !== null) {
      updateTaskData.finalDays = finalDays;
    }

    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id },
        data: updateTaskData,
      }),
      ...scoreRecords.map(r => this.prisma.scoreRecord.create({ data: r })),
    ]);

    return this.prisma.task.findUnique({
      where: { id },
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        scoreRecords: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  }
}
