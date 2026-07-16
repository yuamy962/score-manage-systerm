import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, ScoreType, ScoreSourceType, BadgeType } from '@prisma/client';
import { BadgesService } from '../badges/badges.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ScoresService {
  constructor(
    private prisma: PrismaService,
    private badgesService: BadgesService,
    private notificationService: NotificationService,
  ) {}

  async findMyRecords(userId: string, month?: string) {
    return this.prisma.scoreRecord.findMany({
      where: { userId, ...(month ? { effectMonth: month } : {}) },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllRecords(month?: string) {
    return this.prisma.scoreRecord.findMany({
      where: { taskId: null, ...(month ? { effectMonth: month } : {}) },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserRecords(viewerId: string, role: Role, targetUserId: string, month?: string) {
    if (role === Role.MEMBER && viewerId !== targetUserId) {
      throw new ForbiddenException('无权查看他人积分');
    }

    return this.prisma.scoreRecord.findMany({
      where: { userId: targetUserId, ...(month ? { effectMonth: month } : {}) },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMonthlyRanking(month: string) {
    const records = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: month },
      _sum: { score: true },
    });

    const userIds = records.map(r => r.userId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { notIn: [Role.MANAGER, Role.PM] } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const filteredUserIds = users.map(u => u.id);
    
    const tasks = await this.prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        actualFinishAt: {
          gte: new Date(`${month}-01`),
          lt: new Date(`${parseInt(month.split('-')[0]) + (month.split('-')[1] === '12' ? 1 : 0)}-${(parseInt(month.split('-')[1]) % 12) + 1}-01`),
        },
        assignments: { some: { userId: { in: filteredUserIds } } },
      },
      include: { assignments: true },
    });

    const taskCountMap = new Map<string, number>();
    filteredUserIds.forEach(id => taskCountMap.set(id, 0));
    tasks.forEach(task => {
      task.assignments.forEach(assign => {
        if (taskCountMap.has(assign.userId)) {
          taskCountMap.set(assign.userId, taskCountMap.get(assign.userId)! + 1);
        }
      });
    });

    const sortedRecords = records
      .filter(r => userMap.has(r.userId))
      .sort((a, b) => {
        const scoreA = a._sum.score || 0;
        const scoreB = b._sum.score || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        const countA = taskCountMap.get(a.userId) || 0;
        const countB = taskCountMap.get(b.userId) || 0;
        return countB - countA;
      });

    const totalScore = sortedRecords.reduce((sum, r) => sum + (r._sum.score || 0), 0);
    const avgScore = sortedRecords.length > 0 ? totalScore / sortedRecords.length : 0;
    const memberAvgScore = avgScore;

    return sortedRecords.map((r, index) => {
      const currentScore = r._sum.score || 0;
      let gapToNext = 0;
      if (index > 0) {
        const prevScore = sortedRecords[index - 1]._sum.score || 0;
        if (prevScore > currentScore) {
          gapToNext = Math.round((prevScore - currentScore) * 10) / 10;
        } else {
          let prevIdx = index - 1;
          while (prevIdx >= 0 && (sortedRecords[prevIdx]._sum.score || 0) === currentScore) {
            prevIdx--;
          }
          if (prevIdx >= 0) {
            gapToNext = Math.round(((sortedRecords[prevIdx]._sum.score || 0) - currentScore) * 10) / 10;
          }
        }
      }

      return {
        rank: index + 1,
        userId: r.userId,
        name: userMap.get(r.userId) || '未知',
        totalScore: currentScore,
        taskCount: taskCountMap.get(r.userId) || 0,
        gapToNext,
        avgScore: Math.round(avgScore * 10) / 10,
        memberAvgScore: Math.round(memberAvgScore * 10) / 10,
      };
    });
  }

  async createRecord(userId: string, role: Role, data: {
    targetUserId: string;
    type: ScoreType;
    score: number;
    reason: string;
    evidence?: string;
    taskId?: string;
    sourceType?: ScoreSourceType;
    sourceNo?: string;
    sourceName?: string;
  }) {
    if (role === Role.MEMBER) {
      if (!([ScoreType.OPS, ScoreType.TEAM] as string[]).includes(data.type)) {
        throw new ForbiddenException('无权录入该类型积分');
      }
    }

    if (data.sourceType === ScoreSourceType.REQUIREMENT && !data.sourceNo) {
      throw new ForbiddenException('选择需求作为来源时，必须录入需求单号');
    }
    if (data.sourceType === ScoreSourceType.PROJECT && !data.sourceName) {
      throw new ForbiddenException('选择项目作为来源时，必须录入项目名称');
    }

    const effectMonth = this.getEffectMonth();
    const autoApprove = role !== Role.MEMBER;

    return this.prisma.scoreRecord.create({
      data: {
        userId: data.targetUserId,
        taskId: data.taskId || null,
        type: data.type,
        score: data.score,
        reason: data.reason,
        evidence: data.evidence || null,
        sourceType: data.sourceType || null,
        sourceNo: data.sourceNo || null,
        sourceName: data.sourceName || null,
        createdBy: userId,
        approvedBy: autoApprove ? userId : null,
        approvedAt: autoApprove ? new Date() : null,
        effectMonth,
      },
    });
  }

  async approveRecord(recordId: string, approverId: string, role: Role) {
    const record = await this.prisma.scoreRecord.findUnique({
      where: { id: recordId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!record) throw new NotFoundException('积分记录不存在');
    if (record.approvedAt) throw new ForbiddenException('该记录已审核');

    if (role === Role.PM && record.createdBy !== approverId) {
      throw new ForbiddenException('无权审核此记录');
    }

    const now = new Date();
    const effectMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const updated = await this.prisma.scoreRecord.update({
      where: { id: recordId },
      data: {
        approvedBy: approverId,
        approvedAt: now,
        effectMonth,
      },
    });

    this.checkBadgesAndNotify(record.userId, record.user?.name || '未知', effectMonth).catch(err => {
      console.error('徽章检查失败:', err);
    });

    return updated;
  }

  private async checkBadgesAndNotify(userId: string, userName: string, month: string) {
    try {
      const newBadges = await this.badgesService.checkAndAwardBadges(month);

      const totalRecord = await this.prisma.scoreRecord.aggregate({
        where: { userId },
        _sum: { score: true },
      });
      const totalScore = totalRecord._sum.score || 0;

      const milestones = [
        { type: BadgeType.MILESTONE_100, threshold: 100, name: '百积分里程碑' },
        { type: BadgeType.MILESTONE_500, threshold: 500, name: '五百积分里程碑' },
        { type: BadgeType.MILESTONE_1000, threshold: 1000, name: '千积分里程碑' },
      ];

      for (const m of milestones) {
        if (totalScore >= m.threshold) {
          const existing = await this.prisma.badge.findFirst({
            where: { userId, type: m.type },
          });
          if (!existing) {
            await this.prisma.badge.create({
              data: {
                userId,
                type: m.type,
                reason: `累计积分达到 ${m.threshold} 分，荣获${m.name}`,
              },
            });
            await this.notificationService.notifyMilestone(userName, m.name, totalScore);
          }
        }
      }

      for (const badgeStr of newBadges) {
        if (badgeStr.startsWith(userName)) {
          const badgeName = badgeStr.split(': ')[1];
          if (badgeName) {
            await this.notificationService.notifyBadgeEarned(userName, badgeName, badgeStr);
          }
        }
      }
    } catch (err) {
      console.error('徽章检查通知失败:', err);
    }
  }

  async getPerformanceConfigs() {
    return this.prisma.performanceConfig.findMany({
      orderBy: { minScore: 'desc' },
    });
  }

  async updatePerformanceConfigs(managerId: string, role: Role, configs: { grade: string; minScore: number }[]) {
    if (role !== Role.MANAGER) {
      throw new ForbiddenException('只有部门经理可以修改绩效配置');
    }

    const existing = await this.prisma.performanceConfig.findMany();
    const existingIds = existing.map(e => e.id);

    const updates = configs.map(c => {
      const existingConfig = existing.find(e => e.grade === c.grade);
      if (existingConfig) {
        return this.prisma.performanceConfig.update({
          where: { id: existingConfig.id },
          data: { minScore: c.minScore, updatedBy: managerId, updatedAt: new Date() },
        });
      }
      return this.prisma.performanceConfig.create({
        data: { grade: c.grade, minScore: c.minScore, updatedBy: managerId },
      });
    });

    const deletes = existing.filter(e => !configs.some(c => c.grade === e.grade))
      .map(e => this.prisma.performanceConfig.delete({ where: { id: e.id } }));

    await this.prisma.$transaction([...updates, ...deletes]);
    return this.getPerformanceConfigs();
  }

  async getPerformanceGrade(score: number) {
    const configs = await this.getPerformanceConfigs();
    if (configs.length === 0) {
      return 'D';
    }
    for (const config of configs) {
      if (score >= config.minScore) {
        return config.grade;
      }
    }
    return configs[configs.length - 1]?.grade || 'D';
  }

  async getMyProgress(userId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const monthRecord = await this.prisma.scoreRecord.aggregate({
      where: { userId, effectMonth: currentMonth },
      _sum: { score: true },
    });
    const currentScore = monthRecord._sum.score || 0;

    const totalRecord = await this.prisma.scoreRecord.aggregate({
      where: { userId },
      _sum: { score: true },
    });
    const totalScore = totalRecord._sum.score || 0;

    const configs = await this.getPerformanceConfigs();
    const currentGrade = this.getGradeFromConfigs(currentScore, configs);

    let nextGrade = null;
    let nextGradeGap = 0;
    const sortedConfigs = [...configs].sort((a, b) => b.minScore - a.minScore);
    const currentIdx = sortedConfigs.findIndex(c => c.grade === currentGrade);
    if (currentIdx > 0) {
      nextGrade = sortedConfigs[currentIdx - 1].grade;
      nextGradeGap = Math.round((sortedConfigs[currentIdx - 1].minScore - currentScore) * 10) / 10;
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    const dailyAvg = daysPassed > 0 ? currentScore / daysPassed : 0;
    const predictedScore = Math.round((dailyAvg * daysInMonth) * 10) / 10;

    const memberRanking = await this.getMemberRanking(currentMonth);
    const myRank = memberRanking.findIndex(r => r.userId === userId) + 1;
    const memberAvgScore = memberRanking.length > 0
      ? Math.round(memberRanking.reduce((sum, r) => sum + r.totalScore, 0) / memberRanking.length * 10) / 10
      : 0;

    const sameRoleMembers = memberRanking.filter(r => r.role === user.role);
    const sameRoleAvg = sameRoleMembers.length > 0
      ? Math.round(sameRoleMembers.reduce((sum, r) => sum + r.totalScore, 0) / sameRoleMembers.length * 10) / 10
      : 0;
    const sameRoleRank = sameRoleMembers.findIndex(r => r.userId === userId) + 1;

    const completedTasks = await this.prisma.scoreRecord.groupBy({
      by: ['taskId'],
      where: { userId, effectMonth: currentMonth, taskId: { not: null } },
    });
    const taskCount = completedTasks.length;

    const scoreByType = await this.prisma.scoreRecord.groupBy({
      by: ['type'],
      where: { userId, effectMonth: currentMonth },
      _sum: { score: true },
    });
    const scoreBreakdown = scoreByType.map(r => ({
      type: r.type,
      score: Math.round((r._sum.score || 0) * 10) / 10,
    }));

    return {
      currentMonth,
      currentScore,
      totalScore,
      currentGrade,
      nextGrade,
      nextGradeGap,
      daysPassed,
      daysRemaining,
      dailyAvg: Math.round(dailyAvg * 100) / 100,
      predictedScore,
      myRank,
      totalMembers: memberRanking.length,
      memberAvgScore,
      sameRoleAvg,
      sameRoleRank,
      sameRoleTotal: sameRoleMembers.length,
      taskCount,
      scoreBreakdown,
    };
  }

  async getRoleComparison(userId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const memberRanking = await this.getMemberRanking(currentMonth);
    const sameRoleMembers = memberRanking.filter(r => r.role === user.role);

    const configs = await this.getPerformanceConfigs();

    return sameRoleMembers.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      name: r.name,
      totalScore: r.totalScore,
      grade: this.getGradeFromConfigs(r.totalScore, configs),
      isMe: r.userId === userId,
    }));
  }

  private async getMemberRanking(month: string) {
    const records = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: month },
      _sum: { score: true },
    });

    const userIds = records.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { not: Role.MANAGER } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, { name: u.name, role: u.role }]));

    return records
      .filter(r => userMap.has(r.userId))
      .sort((a, b) => (b._sum.score || 0) - (a._sum.score || 0))
      .map(r => ({
        userId: r.userId,
        name: userMap.get(r.userId)!.name,
        role: userMap.get(r.userId)!.role,
        totalScore: r._sum.score || 0,
      }));
  }

  async getMyHistory(userId: string) {
    const months: string[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let i = 0; i <= currentMonth; i++) {
      months.push(`${currentYear}-${String(i + 1).padStart(2, '0')}`);
    }

    const configs = await this.getPerformanceConfigs();
    const scores: { month: string; score: number; grade: string }[] = [];
    const rankings: { month: string; rank: number | null }[] = [];

    for (const month of months) {
      const record = await this.prisma.scoreRecord.aggregate({
        where: { userId, effectMonth: month },
        _sum: { score: true },
      });
      const score = record._sum.score || 0;
      const grade = this.getGradeFromConfigs(score, configs);
      scores.push({ month, score, grade });

      const ranking = await this.getMemberRanking(month);
      const myRank = ranking.findIndex(r => r.userId === userId) + 1;
      rankings.push({ month, rank: myRank > 0 ? myRank : null });
    }

    return { months, scores, rankings };
  }

  async getPmRanking(month: string) {
    const records = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: month },
      _sum: { score: true },
    });

    const userIds = records.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: Role.PM },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const pmUserIds = users.map(u => u.id);
    const taskCountMap = new Map<string, number>();
    pmUserIds.forEach(id => taskCountMap.set(id, 0));

    const completedTasks = await this.prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        createdBy: { in: pmUserIds },
        actualFinishAt: {
          gte: new Date(`${month}-01`),
          lt: new Date(`${parseInt(month.split('-')[0]) + (month.split('-')[1] === '12' ? 1 : 0)}-${(parseInt(month.split('-')[1]) % 12) + 1}-01`),
        },
      },
      select: { createdBy: true, id: true },
    });
    completedTasks.forEach(t => {
      const count = taskCountMap.get(t.createdBy) || 0;
      taskCountMap.set(t.createdBy, count + 1);
    });

    return records
      .filter(r => userMap.has(r.userId))
      .sort((a, b) => (b._sum.score || 0) - (a._sum.score || 0))
      .map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        name: userMap.get(r.userId)?.name || '未知',
        totalScore: r._sum.score || 0,
        taskCount: taskCountMap.get(r.userId) || 0,
      }));
  }

  async getYearlyRanking(year: string) {
    console.log('getYearlyRanking called with year:', year, 'typeof:', typeof year);

    if (!year || !/^\d{4}$/.test(year)) {
      console.log('Year validation failed, returning empty array');
      return [];
    }

    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;
    console.log('Querying effectMonth between:', startMonth, 'and', endMonth);

    // 使用范围查询确保年份过滤正确
    const allRecords = await this.prisma.scoreRecord.findMany({
      where: { 
        effectMonth: { 
          gte: startMonth,
          lte: endMonth,
        } 
      },
      select: { userId: true, score: true },
    });

    console.log('Query result count:', allRecords.length);

    if (allRecords.length === 0) {
      return [];
    }

    // 手动分组统计
    const userScoreMap = new Map<string, number>();
    allRecords.forEach(record => {
      const current = userScoreMap.get(record.userId) || 0;
      userScoreMap.set(record.userId, current + (record.score || 0));
    });

    const userIds = Array.from(userScoreMap.keys());

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { notIn: [Role.MANAGER, Role.PM] } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const filteredUserIds = users.map(u => u.id);
    
    const tasks = await this.prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        actualFinishAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${parseInt(year) + 1}-01-01`),
        },
        assignments: { some: { userId: { in: filteredUserIds } } },
      },
      include: { assignments: true },
    });

    const taskCountMap = new Map<string, number>();
    filteredUserIds.forEach(id => taskCountMap.set(id, 0));
    tasks.forEach(task => {
      task.assignments.forEach(assign => {
        if (taskCountMap.has(assign.userId)) {
          taskCountMap.set(assign.userId, taskCountMap.get(assign.userId)! + 1);
        }
      });
    });

    // 构建排序数据
    const sortedRecords = filteredUserIds
      .map(userId => ({
        userId,
        totalScore: userScoreMap.get(userId) || 0,
        taskCount: taskCountMap.get(userId) || 0,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.taskCount - a.taskCount;
      });

    const totalScore = sortedRecords.reduce((sum, r) => sum + r.totalScore, 0);
    const avgScore = sortedRecords.length > 0 ? totalScore / sortedRecords.length : 0;
    const memberAvgScore = avgScore;

    return sortedRecords.map((r, index) => {
      const currentScore = r.totalScore;
      let gapToNext = 0;
      if (index > 0) {
        const prevScore = sortedRecords[index - 1].totalScore;
        if (prevScore > currentScore) {
          gapToNext = Math.round((prevScore - currentScore) * 10) / 10;
        } else {
          let prevIdx = index - 1;
          while (prevIdx >= 0 && sortedRecords[prevIdx].totalScore === currentScore) {
            prevIdx--;
          }
          if (prevIdx >= 0) {
            gapToNext = Math.round((sortedRecords[prevIdx].totalScore - currentScore) * 10) / 10;
          }
        }
      }

      return {
        rank: index + 1,
        userId: r.userId,
        name: userMap.get(r.userId) || '未知',
        totalScore: currentScore,
        taskCount: r.taskCount,
        gapToNext,
        avgScore: Math.round(avgScore * 10) / 10,
        memberAvgScore: Math.round(memberAvgScore * 10) / 10,
      };
    });
  }

  async getYearlyPmRanking(year: string) {
    console.log('getYearlyPmRanking called with year:', year, 'typeof:', typeof year);

    if (!year || !/^\d{4}$/.test(year)) {
      console.log('Year validation failed, returning empty array');
      return [];
    }

    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;
    console.log('Querying effectMonth between:', startMonth, 'and', endMonth);

    // 使用范围查询确保年份过滤正确
    const allRecords = await this.prisma.scoreRecord.findMany({
      where: { 
        effectMonth: { 
          gte: startMonth,
          lte: endMonth,
        } 
      },
      select: { userId: true, score: true },
    });

    console.log('Query result count:', allRecords.length);

    if (allRecords.length === 0) {
      return [];
    }

    // 手动分组统计
    const userScoreMap = new Map<string, number>();
    allRecords.forEach(record => {
      const current = userScoreMap.get(record.userId) || 0;
      userScoreMap.set(record.userId, current + (record.score || 0));
    });

    const userIds = Array.from(userScoreMap.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: Role.PM },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const pmUserIds = users.map(u => u.id);
    const taskCountMap = new Map<string, number>();
    pmUserIds.forEach(id => taskCountMap.set(id, 0));

    const completedTasks = await this.prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        createdBy: { in: pmUserIds },
        actualFinishAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${parseInt(year) + 1}-01-01`),
        },
      },
      select: { createdBy: true, id: true },
    });
    completedTasks.forEach(t => {
      const count = taskCountMap.get(t.createdBy) || 0;
      taskCountMap.set(t.createdBy, count + 1);
    });

    // 构建排序数据
    const sortedRecords = pmUserIds
      .map(userId => ({
        userId,
        totalScore: userScoreMap.get(userId) || 0,
        taskCount: taskCountMap.get(userId) || 0,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.taskCount - a.taskCount;
      });

    return sortedRecords.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      name: userMap.get(r.userId)?.name || '未知',
      totalScore: r.totalScore,
      taskCount: r.taskCount,
    }));
  }

  async getYearlyMemberRanking(year: string) {
    console.log('getYearlyMemberRanking called with year:', year, 'typeof:', typeof year);

    if (!year || !/^\d{4}$/.test(year)) {
      console.log('Year validation failed, returning empty array');
      return [];
    }

    const yearPrefix = `${year}-`;
    console.log('Querying effectMonth starting with:', yearPrefix);

    // 使用 findMany 获取所有符合条件的记录
    const allRecords = await this.prisma.scoreRecord.findMany({
      where: { effectMonth: { startsWith: yearPrefix } },
      select: { userId: true, score: true },
    });

    console.log('Query result count:', allRecords.length);

    if (allRecords.length === 0) {
      return [];
    }

    // 手动分组统计
    const userScoreMap = new Map<string, number>();
    allRecords.forEach(record => {
      const current = userScoreMap.get(record.userId) || 0;
      userScoreMap.set(record.userId, current + (record.score || 0));
    });

    const userIds = Array.from(userScoreMap.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { not: Role.MANAGER } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, { name: u.name, role: u.role }]));

    return userIds
      .filter(userId => userMap.has(userId))
      .map(userId => ({
        userId,
        name: userMap.get(userId)!.name,
        role: userMap.get(userId)!.role,
        totalScore: userScoreMap.get(userId) || 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  private getGradeFromConfigs(score: number, configs: { grade: string; minScore: number }[]): string {
    if (configs.length === 0) return 'D';
    for (const c of configs) {
      if (score >= c.minScore) return c.grade;
    }
    return configs[configs.length - 1]?.grade || 'D';
  }

  private getEffectMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
