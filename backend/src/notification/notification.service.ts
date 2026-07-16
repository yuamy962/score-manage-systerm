import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, Role } from '@prisma/client';
import * as crypto from 'crypto';

interface FeishuCardElement {
  tag: string;
  text?: {
    tag: string;
    content: string;
  };
  fields?: Array<{
    is_short: boolean;
    text: {
      tag: string;
      content: string;
    };
  }>;
}

interface FeishuCardAction {
  tag: string;
  text: {
    tag: string;
    content: string;
  };
  type?: string;
  url?: string;
}

interface FeishuCard {
  config: {
    wide_screen_mode: boolean;
    enable_forward: boolean;
  };
  header: {
    template: string;
    title: {
      tag: string;
      content: string;
    };
  };
  elements: FeishuCardElement[];
  actions?: FeishuCardAction[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly webhookUrl: string;
  private readonly secret: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.webhookUrl = this.configService.get<string>('FEISHU_WEBHOOK_URL') || '';
    this.secret = this.configService.get<string>('FEISHU_SECRET') || '';
  }

  private generateSignature(): { timestamp: string; sign: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `${timestamp}\n${this.secret}`;
    const sign = crypto
      .createHmac('sha256', stringToSign)
      .update('')
      .digest('base64');
    return { timestamp, sign };
  }

  async sendCard(card: FeishuCard) {
    if (!this.webhookUrl) {
      this.logger.warn('FEISHU_WEBHOOK_URL 未配置，跳过发送');
      return;
    }

    try {
      const { timestamp, sign } = this.generateSignature();

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp,
          sign,
          msg_type: 'interactive',
          card,
        }),
      });

      const result = await response.json() as any;
      if (result.code !== 0) {
        this.logger.error(`飞书通知发送失败: ${result.msg}`);
      } else {
        this.logger.log('飞书通知发送成功');
      }
    } catch (error) {
      this.logger.error(`飞书通知发送异常: ${error.message}`);
    }
  }

  async sendText(content: string) {
    if (!this.webhookUrl) {
      this.logger.warn('FEISHU_WEBHOOK_URL 未配置，跳过发送');
      return;
    }

    try {
      const { timestamp, sign } = this.generateSignature();

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp,
          sign,
          msg_type: 'text',
          content: { text: content },
        }),
      });

      const result = await response.json() as any;
      if (result.code !== 0) {
        this.logger.error(`飞书文本通知发送失败: ${result.msg}`);
      } else {
        this.logger.log('飞书文本通知发送成功');
      }
    } catch (error) {
      this.logger.error(`飞书文本通知发送异常: ${error.message}`);
    }
  }

  async notifyTaskSubmitted(task: any) {
    const assigneeNames = task.assignments?.map((a: any) => a.user?.name || '未知').join('、') || '无';
    const finalDays = task.finalDays ?? task.estimatedDays;

    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'blue',
        title: {
          tag: 'plain_text',
          content: '📋 任务提交审核通知',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**任务标题**：${task.title}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**提交人**：${assigneeNames}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**预估工作量**：${task.estimatedDays} 人日`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**提交工作量**：${finalDays} 人日`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**提交时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '> 请项目经理及时审核',
          },
        },
      ],
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '查看任务',
          },
          type: 'primary',
          url: 'http://localhost:3000/dashboard/tasks',
        },
      ],
    };

    await this.sendCard(card);
  }

  async notifyTaskAssigned(task: any, assigneePhones: string[]) {
    const assigneeNames = task.assignments?.map((a: any) => a.user?.name || '未知').join('、') || '无';
    const creatorName = task.creator?.name || '未知';
    const planFinish = task.planFinishAt
      ? new Date(task.planFinishAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '未设置';

    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'blue',
        title: {
          tag: 'plain_text',
          content: '📋 新任务下发',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**任务标题**：${task.title}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**下达人**：${creatorName}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**负责人**：${assigneeNames}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**预估工作量**：${task.estimatedDays} 人日`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**计划完成日期**：${planFinish}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**任务类型**：${task.taskType || '需求开发'}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '> 请及时查看并开始处理',
          },
        },
      ],
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '查看任务',
          },
          type: 'primary',
          url: 'http://localhost:3000/dashboard/tasks',
        },
      ],
    };

    await this.sendCard(card);
  }

  @Cron('0 10 * * *', { timeZone: 'Asia/Shanghai' })
  async notifyExpiringTasks() {
    if (!this.webhookUrl) {
      this.logger.warn('FEISHU_WEBHOOK_URL 未配置，跳过到期提醒');
      return;
    }

    const now = new Date();
    const twoDaysLater = new Date(now);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(23, 59, 59, 999);

    const activeStatuses: TaskStatus[] = [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
    ];

    const tasks = await this.prisma.task.findMany({
      where: {
        status: { in: activeStatuses },
        planFinishAt: { lte: twoDaysLater },
      },
      include: {
        assignments: { include: { user: { select: { name: true } } } },
        creator: { select: { name: true } },
      },
      orderBy: { planFinishAt: 'asc' },
    });

    if (tasks.length === 0) {
      this.logger.log('暂无即将到期或已逾期的任务');
      return;
    }

    const overdue: string[] = [];
    const tomorrow: string[] = [];
    const withinTwoDays: string[] = [];

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    for (const task of tasks) {
      const planDate = new Date(task.planFinishAt!);
      const assigneeNames = task.assignments?.map((a: any) => a.user?.name || '未知').join('、') || task.creator?.name || '无';
      const dateStr = planDate.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

      const line = `${task.title} — 负责人：${assigneeNames}，计划完成：${dateStr}`;

      if (planDate < todayStart) {
        overdue.push(line);
      } else if (planDate <= tomorrowEnd) {
        tomorrow.push(line);
      } else {
        withinTwoDays.push(line);
      }
    }

    const elements: FeishuCardElement[] = [];

    if (overdue.length > 0) {
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `### 🔴 已逾期（${overdue.length}个）`,
        },
      });
      overdue.forEach(line => {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> ${line}`,
          },
        });
      });
    }
    if (tomorrow.length > 0) {
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `### 🟠 明天到期（${tomorrow.length}个）`,
        },
      });
      tomorrow.forEach(line => {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> ${line}`,
          },
        });
      });
    }
    if (withinTwoDays.length > 0) {
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `### 🟡 2天内到期（${withinTwoDays.length}个）`,
        },
      });
      withinTwoDays.forEach(line => {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> ${line}`,
          },
        });
      });
    }

    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'orange',
        title: {
          tag: 'plain_text',
          content: '⚠️ 即将到期任务提醒',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**统计时间**：${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
          },
        },
        ...elements,
      ],
    };

    await this.sendCard(card);
  }

  @Cron('30 17 * * 5', { timeZone: 'Asia/Shanghai' })
  async notifyWeeklyStar() {
    if (!this.webhookUrl) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const records = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: currentMonth },
      _sum: { score: true },
    });

    const userIds = records.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { not: Role.MANAGER } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const ranking = records
      .filter(r => userMap.has(r.userId))
      .sort((a, b) => (b._sum.score || 0) - (a._sum.score || 0));

    if (ranking.length === 0) {
      this.logger.log('暂无积分数据，跳过周度之星推送');
      return;
    }

    const star = ranking[0];
    const starName = userMap.get(star.userId) || '未知';
    const starScore = star._sum.score || 0;

    const top5 = ranking.slice(0, 5).map((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `> ${medal} ${userMap.get(r.userId) || '未知'}：${r._sum.score || 0} 分`;
    });

    const weekNum = Math.ceil(now.getDate() / 7);

    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'purple',
        title: {
          tag: 'plain_text',
          content: '⭐ 本周之星',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**${now.getFullYear()}年${now.getMonth() + 1}月 第${weekNum}周**`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `### 🏆 恭喜 **${starName}** 以 **${starScore}** 分荣登榜首！`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '#### 📊 积分榜 TOP5',
          },
        },
        ...top5.map(line => ({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: line,
          },
        })),
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '> 继续加油，下周之星可能就是你！',
          },
        },
      ],
    };

    await this.sendCard(card);
  }

  @Cron('0 9 28-31 * *', { timeZone: 'Asia/Shanghai' })
  async notifyMonthEndSprint() {
    if (!this.webhookUrl) return;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() < daysInMonth - 2) return;

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const remainingDays = daysInMonth - now.getDate();

    const configs = await this.prisma.performanceConfig.findMany({ orderBy: { minScore: 'desc' } });

    const records = await this.prisma.scoreRecord.groupBy({
      by: ['userId'],
      where: { effectMonth: currentMonth },
      _sum: { score: true },
    });

    const userIds = records.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: true, role: { not: Role.MANAGER } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const nearBoundary: string[] = [];

    for (const r of records) {
      if (!userMap.has(r.userId)) continue;
      const score = r._sum.score || 0;
      const name = userMap.get(r.userId)!;

      for (let i = 0; i < configs.length; i++) {
        if (score >= configs[i].minScore) {
          if (i > 0) {
            const nextGrade = configs[i - 1];
            const gap = Math.round((nextGrade.minScore - score) * 10) / 10;
            if (gap <= 20 && gap > 0) {
              nearBoundary.push(`> ${name}：当前 ${configs[i].grade}（${score}分），距 ${nextGrade.grade} 仅差 **${gap}** 分`);
            }
          }
          break;
        }
      }
    }

    if (nearBoundary.length === 0) return;

    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'red',
        title: {
          tag: 'plain_text',
          content: '🔥 月末冲刺提醒',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> 距本月结束仅剩 **${remainingDays}** 天！`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '#### 以下同学距离上一等级仅差一步之遥：',
          },
        },
        ...nearBoundary.map(line => ({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: line,
          },
        })),
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '> 抓紧最后几天，冲刺更高等级！💪',
          },
        },
      ],
    };

    await this.sendCard(card);
  }

  async notifyMilestone(userName: string, milestone: string, totalScore: number) {
    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'green',
        title: {
          tag: 'plain_text',
          content: '🎉 里程碑达成！',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> 恭喜 **${userName}** 累计积分达到 **${totalScore}** 分！`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> 获得【${milestone}】徽章 🏅`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '> 继续保持，向下一个里程碑进发！',
          },
        },
      ],
    };

    await this.sendCard(card);
  }

  async notifyBadgeEarned(userName: string, badgeName: string, reason: string) {
    const card: FeishuCard = {
      config: {
        wide_screen_mode: true,
        enable_forward: true,
      },
      header: {
        template: 'purple',
        title: {
          tag: 'plain_text',
          content: '🏅 成就解锁！',
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> 恭喜 **${userName}** 获得徽章【${badgeName}】`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `> ${reason}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '> 向优秀看齐！',
          },
        },
      ],
    };

    await this.sendCard(card);
  }
}