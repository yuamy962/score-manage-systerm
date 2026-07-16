import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewStyle, ReviewStatus } from '@prisma/client';

interface ScoreSummary {
  totalScore: number;
  taskCount: number;
  completedCount: number;
  rejectedCount: number;
  avgScore: number;
  onTimeRate: number;
  topTypes: { type: string; score: number }[];
  monthlyTrend: { month: string; score: number }[];
}

const PROMPT_TEMPLATES: Record<ReviewStyle, string> = {
  [ReviewStyle.ENCOURAGING]: `你是一位温暖鼓励型的绩效导师，正在为一位新人写月度绩效评语。
请基于以下数据，用鼓励的语气写一段200字左右的绩效评语。重点肯定进步和努力，温和指出需要提升的地方，给出具体建议。
语气：温暖、鼓励、有耐心，像学长学姐一样。`,

  [ReviewStyle.STRICT]: `你是一位严格但公正的绩效主管，正在为一位经验丰富的老员工写月度绩效评语。
请基于以下数据，用严肃专业的语气写一段200字左右的绩效评语。直接指出问题和不足，不回避矛盾，同时认可确实做得好的地方。
语气：严肃、直接、一针见血，不留情面但有理有据。`,

  [ReviewStyle.MOTIVATING]: `你是一位充满激情的团队领袖，正在为一位骨干成员写月度绩效评语。
请基于以下数据，用激励的语气写一段200字左右的绩效评语。肯定核心贡献，激发更大潜力，提出更高期望。
语气：激情、振奋、有感染力，像教练赛前动员。`,

  [ReviewStyle.GENERAL]: `你是一位专业客观的绩效评估师，正在为员工写月度绩效评语。
请基于以下数据，用客观中肯的语气写一段200字左右的绩效评语。既肯定成绩，也指出不足，给出改进建议。
语气：专业、客观、中肯、不偏不倚。`,
};

@Injectable()
export class ReviewsService {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly modelName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('DEEPSEEK_API_URL') || 'https://api.deepseek.com/v1/chat/completions';
    this.modelName = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';
  }

  async generateReview(userId: string, month: string, style: ReviewStyle, createdBy: string) {
    if (!this.apiKey) {
      throw new BadRequestException('DeepSeek API Key 未配置，请在 .env 中设置 DEEPSEEK_API_KEY');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const summary = await this.getScoreSummary(userId, month);

    const existing = await this.prisma.performanceReview.findUnique({
      where: { userId_month_style: { userId, month, style } },
    });
    if (existing) {
      return this.prisma.performanceReview.update({
        where: { id: existing.id },
        data: {
          content: await this.callDeepSeek(user.name, month, summary, style),
          scoreData: JSON.stringify(summary),
          createdBy,
        },
      });
    }

    const content = await this.callDeepSeek(user.name, month, summary, style);

    return this.prisma.performanceReview.create({
      data: {
        userId,
        month,
        style,
        content,
        scoreData: JSON.stringify(summary),
        createdBy,
      },
    });
  }

  async batchGenerateReviews(month: string, style: ReviewStyle, createdBy: string) {
    const users = await this.prisma.user.findMany({
      where: { status: true, role: 'MEMBER' },
    });

    const results = [];
    for (const user of users) {
      try {
        const review = await this.generateReview(user.id, month, style, createdBy);
        results.push({ userId: user.id, name: user.name, success: true, review });
      } catch (e: any) {
        results.push({ userId: user.id, name: user.name, success: false, error: e.message });
      }
    }
    return results;
  }

  async updateReview(id: string, content: string, updatedBy: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('评语不存在');
    if (review.status === ReviewStatus.PUBLISHED) {
      throw new ForbiddenException('已下发的评语不可编辑');
    }
    return this.prisma.performanceReview.update({
      where: { id },
      data: { content, createdBy: updatedBy },
    });
  }

  async publishReview(id: string, publishedBy: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('评语不存在');
    if (review.status === ReviewStatus.PUBLISHED) {
      throw new BadRequestException('该评语已下发，不可重复下发');
    }
    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: ReviewStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedBy,
      },
    });
  }

  async batchPublish(month: string, publishedBy: string) {
    const drafts = await this.prisma.performanceReview.findMany({
      where: { month, status: ReviewStatus.DRAFT },
    });
    const results = [];
    for (const review of drafts) {
      try {
        const updated = await this.prisma.performanceReview.update({
          where: { id: review.id },
          data: {
            status: ReviewStatus.PUBLISHED,
            publishedAt: new Date(),
            publishedBy,
          },
        });
        results.push({ id: review.id, success: true, review: updated });
      } catch (e: any) {
        results.push({ id: review.id, success: false, error: e.message });
      }
    }
    return results;
  }

  async getUserReviews(userId: string, month?: string) {
    const where: any = { userId, status: ReviewStatus.PUBLISHED };
    if (month) where.month = month;
    return this.prisma.performanceReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyDrafts(userId: string, month?: string) {
    const where: any = { userId, status: ReviewStatus.DRAFT };
    if (month) where.month = month;
    return this.prisma.performanceReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllReviews(month: string) {
    return this.prisma.performanceReview.findMany({
      where: { month },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getReview(userId: string, month: string, style: ReviewStyle) {
    return this.prisma.performanceReview.findUnique({
      where: { userId_month_style: { userId, month, style } },
    });
  }

  private async getScoreSummary(userId: string, month: string): Promise<ScoreSummary> {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await this.prisma.scoreRecord.findMany({
      where: {
        userId,
        effectMonth: month,
      },
    });

    const tasks = await this.prisma.task.findMany({
      where: {
        assignments: { some: { userId } },
        status: { in: ['COMPLETED', 'IN_REVIEW', 'REJECTED'] },
        actualFinishAt: { gte: startDate, lt: endDate },
      },
    });

    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const rejectedTasks = tasks.filter((t) => t.status === 'REJECTED');

    const totalScore = records.reduce((sum, r) => sum + r.score, 0);
    const onTimeTasks = completedTasks.filter((t) => {
      if (!t.planFinishAt || !t.actualFinishAt) return true;
      return t.actualFinishAt <= t.planFinishAt;
    });

    const typeScores: Record<string, number> = {};
    records.forEach((r) => {
      typeScores[r.type] = (typeScores[r.type] || 0) + r.score;
    });
    const topTypes = Object.entries(typeScores)
      .map(([type, score]) => ({ type, score }))
      .sort((a, b) => b.score - a.score);

    const last3Months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() - i);
      last3Months.push(d.toISOString().slice(0, 7));
    }

    const monthlyTrend: { month: string; score: number }[] = [];
    for (const m of last3Months) {
      const mRecords = await this.prisma.scoreRecord.findMany({
        where: { userId, effectMonth: m },
      });
      monthlyTrend.push({ month: m, score: mRecords.reduce((s, r) => s + r.score, 0) });
    }

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      taskCount: tasks.length,
      completedCount: completedTasks.length,
      rejectedCount: rejectedTasks.length,
      avgScore: tasks.length > 0 ? Math.round((totalScore / tasks.length) * 100) / 100 : 0,
      onTimeRate: completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 100,
      topTypes,
      monthlyTrend,
    };
  }

  private async callDeepSeek(name: string, month: string, summary: ScoreSummary, style: ReviewStyle): Promise<string> {
    const systemPrompt = PROMPT_TEMPLATES[style];

    const userPrompt = `员工姓名：${name}
评估月份：${month}
绩效数据：
- 本月总积分：${summary.totalScore}
- 任务总数：${summary.taskCount}，已完成：${summary.completedCount}，被驳回：${summary.rejectedCount}
- 平均单任务积分：${summary.avgScore}
- 按时完成率：${summary.onTimeRate}%
- 积分类型分布：${summary.topTypes.map((t) => `${t.type}(${t.score}分)`).join('、')}
- 近3个月积分趋势：${summary.monthlyTrend.map((m) => `${m.month}: ${m.score}分`).join(' → ')}

请根据以上数据生成绩效评语。

要求：
1. 开头必须固定为："${name}同学，您好！"
2. 不要出现"通用型"、"新人鼓励型"、"老油子敲打型"、"骨干激励型"等风格类型字样
3. 评语正文直接承接开头，自然流畅`;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(`DeepSeek API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '评语生成失败';
  }
}
