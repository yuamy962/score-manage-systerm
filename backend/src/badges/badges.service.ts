import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgeType, Role } from '@prisma/client';

const BADGE_DEFINITIONS = [
  { type: BadgeType.MONTHLY_STAR, name: '月度之星', icon: '🌟', description: '当月积分排名第1名' },
  { type: BadgeType.CONSECUTIVE_A_GRADE, name: '连续3个月A级', icon: '💎', description: '连续3个月绩效等级达到A' },
  { type: BadgeType.TASK_HARVESTER, name: '任务收割机', icon: '🌾', description: '当月完成任务数≥10' },
  { type: BadgeType.ZERO_REJECTION, name: '零驳回', icon: '🛡️', description: '当月无被驳回的任务' },
  { type: BadgeType.KNOWLEDGE_CONTRIBUTOR, name: '知识贡献者', icon: '📚', description: '当月获得团队贡献积分' },
  { type: BadgeType.MILESTONE_100, name: '百积分里程碑', icon: '🏅', description: '累计积分达到100分' },
  { type: BadgeType.MILESTONE_500, name: '五百积分里程碑', icon: '🥈', description: '累计积分达到500分' },
  { type: BadgeType.MILESTONE_1000, name: '千积分里程碑', icon: '🥇', description: '累计积分达到1000分' },
  { type: BadgeType.CONSECUTIVE_BP, name: '稳定输出', icon: '🔥', description: '连续3个月绩效等级达到B+以上' },
];

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private prisma: PrismaService) {}

  getBadgeDefinitions() {
    return BADGE_DEFINITIONS;
  }

  async getUserBadges(userId: string) {
    return this.prisma.badge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllBadgesWithStatus(userId: string) {
    const earned = await this.prisma.badge.findMany({ where: { userId } });
    const earnedMap = new Map(earned.map(b => {
      const key = b.month ? `${b.type}_${b.month}` : b.type;
      return [key, b];
    }));

    return BADGE_DEFINITIONS.map(def => {
      const earnedBadge = earnedMap.get(def.type) || earned.find(b => b.type === def.type);
      return {
        ...def,
        earned: !!earnedBadge,
        earnedAt: earnedBadge?.createdAt || null,
        reason: earnedBadge?.reason || null,
      };
    });
  }

  async checkAndAwardBadges(month: string) {
    this.logger.log(`开始检查 ${month} 月徽章...`);

    const users = await this.prisma.user.findMany({
      where: { status: true, role: { not: Role.MANAGER } },
      select: { id: true, name: true },
    });

    const rankings = await this.getMonthlyRanking(month);
    const configs = await this.prisma.performanceConfig.findMany({ orderBy: { minScore: 'desc' } });

    const newBadges: string[] = [];

    for (const user of users) {
      const userRank = rankings.find(r => r.userId === user.id);
      const userScore = userRank?.totalScore || 0;
      const taskCount = userRank?.taskCount || 0;
      const grade = this.getGrade(userScore, configs);

      if (rankings.length > 0 && rankings[0].userId === user.id) {
        await this.awardBadge(user.id, BadgeType.MONTHLY_STAR, month, `${month}月积分排名第1名，荣获月度之星`);
        newBadges.push(`${user.name}: 月度之星`);
      }

      if (taskCount >= 10) {
        await this.awardBadge(user.id, BadgeType.TASK_HARVESTER, month, `${month}月完成任务 ${taskCount} 个，荣获任务收割机`);
        newBadges.push(`${user.name}: 任务收割机`);
      }

      const rejectedCount = await this.prisma.task.count({
        where: {
          assignments: { some: { userId: user.id } },
          status: 'REJECTED',
        },
      });
      if (rejectedCount === 0 && taskCount > 0) {
        await this.awardBadge(user.id, BadgeType.ZERO_REJECTION, month, `${month}月零驳回，质量过硬`);
        newBadges.push(`${user.name}: 零驳回`);
      }

      const teamScore = await this.prisma.scoreRecord.aggregate({
        where: { userId: user.id, type: 'TEAM', effectMonth: month },
        _sum: { score: true },
      });
      if ((teamScore._sum.score || 0) > 0) {
        await this.awardBadge(user.id, BadgeType.KNOWLEDGE_CONTRIBUTOR, month, `${month}月获得团队贡献积分 ${(teamScore._sum.score || 0).toFixed(1)} 分`);
        newBadges.push(`${user.name}: 知识贡献者`);
      }

      await this.checkConsecutiveBadges(user.id, user.name, month, grade, newBadges);

      await this.checkMilestoneBadges(user.id, user.name, newBadges);
    }

    this.logger.log(`徽章检查完成，新增 ${newBadges.length} 个徽章: ${newBadges.join(', ')}`);
    return newBadges;
  }

  private async checkConsecutiveBadges(userId: string, userName: string, currentMonth: string, currentGrade: string, newBadges: string[]) {
    const months: string[] = [];
    const [year, mon] = currentMonth.split('-').map(Number);
    for (let i = 0; i < 6; i++) {
      let m = mon - i;
      let y = year;
      while (m <= 0) { m += 12; y--; }
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }

    const configs = await this.prisma.performanceConfig.findMany({ orderBy: { minScore: 'desc' } });

    let consecutiveA = 0;
    let consecutiveBP = 0;

    for (const month of months) {
      const records = await this.prisma.scoreRecord.aggregate({
        where: { userId, effectMonth: month },
        _sum: { score: true },
      });
      const score = records._sum.score || 0;
      const grade = this.getGrade(score, configs);

      if (grade === 'A') {
        consecutiveA++;
      } else {
        consecutiveA = 0;
      }

      if (['A', 'B+'].includes(grade)) {
        consecutiveBP++;
      } else {
        consecutiveBP = 0;
      }
    }

    if (consecutiveA >= 3) {
      await this.awardBadge(userId, BadgeType.CONSECUTIVE_A_GRADE, currentMonth, `连续 ${consecutiveA} 个月绩效等级达到A`);
      newBadges.push(`${userName}: 连续3个月A级`);
    }

    if (consecutiveBP >= 3) {
      await this.awardBadge(userId, BadgeType.CONSECUTIVE_BP, currentMonth, `连续 ${consecutiveBP} 个月绩效等级达到B+以上，稳定输出`);
      newBadges.push(`${userName}: 稳定输出`);
    }
  }

  private async checkMilestoneBadges(userId: string, userName: string, newBadges: string[]) {
    const totalResult = await this.prisma.scoreRecord.aggregate({
      where: { userId },
      _sum: { score: true },
    });
    const totalScore = totalResult._sum.score || 0;

    const milestones = [
      { type: BadgeType.MILESTONE_100, threshold: 100, name: '百积分里程碑' },
      { type: BadgeType.MILESTONE_500, threshold: 500, name: '五百积分里程碑' },
      { type: BadgeType.MILESTONE_1000, threshold: 1000, name: '千积分里程碑' },
    ];

    for (const m of milestones) {
      if (totalScore >= m.threshold) {
        await this.awardBadge(userId, m.type, null, `累计积分达到 ${m.threshold} 分，荣获${m.name}`);
        newBadges.push(`${userName}: ${m.name}`);
      }
    }
  }

  private async awardBadge(userId: string, type: BadgeType, month: string | null, reason: string) {
    try {
      await this.prisma.badge.upsert({
        where: { userId_type_month: { userId, type, month: month || '' } },
        update: { reason },
        create: { userId, type, month, reason },
      });
    } catch {
      // already exists
    }
  }

  private getGrade(score: number, configs: { grade: string; minScore: number }[]): string {
    if (configs.length === 0) return 'D';
    for (const c of configs) {
      if (score >= c.minScore) return c.grade;
    }
    return configs[configs.length - 1]?.grade || 'D';
  }

  private async getMonthlyRanking(month: string) {
    const records = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: month },
      _sum: { score: true },
    });

    const userIds = records.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { not: Role.MANAGER } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const taskCounts = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: month, taskId: { not: null } },
      _count: { taskId: true },
    });
    const taskCountMap = new Map(taskCounts.map(t => [t.userId, t._count.taskId]));

    return records
      .filter(r => userMap.has(r.userId))
      .sort((a, b) => (b._sum.score || 0) - (a._sum.score || 0))
      .map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        name: userMap.get(r.userId) || '未知',
        totalScore: r._sum.score || 0,
        taskCount: taskCountMap.get(r.userId) || 0,
      }));
  }
}
