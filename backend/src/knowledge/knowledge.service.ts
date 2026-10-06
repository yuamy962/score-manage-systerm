import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  KnowledgeType,
  KnowledgeStatus,
  KnowledgePermission,
  KnowledgeGapStatus,
  Role,
  Prisma,
} from '@prisma/client';

// 三类知识模板对应的 AI 整理提示词
const ORGANIZE_PROMPT: Record<KnowledgeType, string> = {
  [KnowledgeType.BASIC]: `你是一名资深的电信业务知识整理专家。请把员工提供的"基础信息"原始内容整理成结构化知识。
员工输入是一个 JSON，可能包含字段：name（知识名称）、content（知识内容，自由文本）、supplement（补充说明）。
输出必须是严格的 JSON（不要有任何多余文字），结构如下：
{
  "title": "简洁准确的知识标题",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "content": {
    "overview": "知识概述（2-3句）",
    "details": "详细内容（分点，条理清晰）",
    "supplement": "补充说明"
  },
  "notes": "需要特别提醒的注意事项，没有则为空字符串"
}
要求：只能依据员工提供的内容整理，保留原始事实，不得编造；员工未提供的信息一律填写"待补充"；必须保留员工填写的风险和注意事项；语言专业规范；关键词2-5个，来源于内容本身。`,

  [KnowledgeType.OPERATION]: `你是一名资深的电信业务知识整理专家。请把员工提供的"操作流程"原始内容整理成结构化知识。
员工输入是一个 JSON，可能包含字段：name（要做什么）、how（怎么操作，自由文本）、notes（注意事项）。
输出必须是严格的 JSON（不要有任何多余文字），结构如下：
{
  "title": "操作流程的规范名称",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "content": {
    "scenario": "应用场景",
    "precheck": "前置条件/准备",
    "steps": "操作步骤（分步，序号清晰）",
    "resultVerify": "结果校验/预期结果"
  },
  "notes": "注意事项，没有则为空字符串"
}
要求：只能依据员工提供的内容整理，保留原始步骤事实，不得编造或自行增加操作步骤；员工未提供的信息（如前置条件、结果校验）一律填写"待补充"；必须保留员工填写的风险和注意事项；步骤要完整可执行；关键词2-5个，来源于内容本身。`,

  [KnowledgeType.PROBLEM]: `你是一名资深的电信业务知识整理专家。请把员工提供的"问题经验"原始内容整理成结构化知识。
员工输入是一个 JSON，可能包含字段：name（遇到的问题）、cause（原因）、solution（解决过程，自由文本）、notes（注意事项）。
输出必须是严格的 JSON（不要有任何多余文字），结构如下：
{
  "title": "问题现象的简洁标题",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "content": {
    "phenomenon": "问题现象",
    "cause": "产生原因/分析",
    "process": "处理过程/解决方案（分步）",
    "result": "处理结果"
  },
  "notes": "注意事项/经验总结，没有则为空字符串"
}
要求：只能依据员工提供的内容整理，保留原始事实，不得编造；员工未提供的信息（如处理结果）一律填写"待补充"；必须保留员工填写的风险和注意事项；解决方案要可复现；关键词2-5个，来源于内容本身。`,
};

// AI 知识助手问答提示词
const ASK_PROMPT = `你是部门AI知识助手，负责回答员工关于部门业务系统、操作流程和问题处理经验的咨询。
你只能依据提供的【正式知识】回答员工问题，必须严格遵守：
1. 只能基于给定知识内容回答，禁止使用互联网通用知识推测部门内部系统情况；
2. 禁止编造业务知识，禁止生成生产SQL、生产操作命令、IP、账号、密码、Token；
3. 如果给定知识不足以回答员工问题，直接回复："当前部门知识库暂未检索到相关已审核知识，建议联系相关模块负责人确认。"，不做任何额外发挥；
4. 回答条理清晰，适当分点，保留知识中的注意事项和风险提醒；
5. 回答末尾另起一行列出参考来源，格式：来源：《知识标题》`;

@Injectable()
export class KnowledgeService {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly modelName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
    this.apiUrl =
      this.configService.get<string>('DEEPSEEK_API_URL') ||
      'https://api.deepseek.com/v1/chat/completions';
    this.modelName = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';
  }

  // ============ 知识模块（系统下的二级模块）基础数据 ============

  async listModules(systemModuleId?: string) {
    const where = systemModuleId
      ? { systemModuleId, status: true }
      : { status: true };
    return this.prisma.knowledgeModule.findMany({
      where,
      include: { systemModule: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listAllModules() {
    return this.prisma.knowledgeModule.findMany({
      include: { systemModule: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createModule(data: { systemModuleId: string; name: string; sortOrder?: number }) {
    return this.prisma.knowledgeModule.create({
      data: {
        systemModuleId: data.systemModuleId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateModule(id: string, data: { name?: string; sortOrder?: number; status?: boolean }) {
    return this.prisma.knowledgeModule.update({
      where: { id },
      data,
    });
  }

  async deleteModule(id: string) {
    return this.prisma.knowledgeModule.delete({ where: { id } });
  }

  // ============ 知识 CRUD ============

  async create(userId: string, dto: CreateKnowledgeDto) {
    const content = (dto.content as Prisma.InputJsonValue) ?? (dto.rawContent as Prisma.InputJsonValue) ?? {};
    const keywords = dto.keywords ?? [];
    const contentText = this.buildContentText(dto.title, content, keywords);

    return this.prisma.knowledge.create({
      data: {
        title: dto.title,
        knowledgeType: dto.knowledgeType,
        systemModuleId: dto.systemModuleId || null,
        moduleId: dto.moduleId || null,
        permissionLevel: dto.permissionLevel || KnowledgePermission.NORMAL,
        creatorId: userId,
        versions: {
          create: {
            version: 1,
            title: dto.title,
            contentJson: content,
            rawContentJson: (dto.rawContent as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            contentText,
            keywords,
            creatorId: userId,
          },
        },
      },
      include: this.knowledgeDetailInclude,
    });
  }

  async update(userId: string, id: string, dto: UpdateKnowledgeDto) {
    const knowledge = await this.findOrThrow(id);

    if (knowledge.creatorId !== userId) {
      throw new ForbiddenException('只能编辑自己创建的知识');
    }
    if (knowledge.status !== KnowledgeStatus.DRAFT) {
      throw new BadRequestException('仅草稿状态可编辑');
    }

    const latestVersion = await this.getLatestVersion(id);

    const data: Prisma.KnowledgeUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.knowledgeType !== undefined) data.knowledgeType = dto.knowledgeType;
    if (dto.systemModuleId !== undefined) data.systemModuleId = dto.systemModuleId || null;
    if (dto.moduleId !== undefined) data.moduleId = dto.moduleId || null;
    if (dto.permissionLevel !== undefined) data.permissionLevel = dto.permissionLevel;

    await this.prisma.knowledge.update({ where: { id }, data });

    // 更新草稿版本内容
    if (
      dto.title !== undefined ||
      dto.content !== undefined ||
      dto.rawContent !== undefined ||
      dto.keywords !== undefined
    ) {
      const newTitle = dto.title ?? latestVersion.title;
      const newContent =
        (dto.content as Prisma.InputJsonValue) ?? (latestVersion.contentJson as Prisma.JsonValue);
      const newRaw =
        (dto.rawContent as Prisma.InputJsonValue) ??
        (latestVersion.rawContentJson as Prisma.JsonValue) ??
        Prisma.JsonNull;
      const newKeywords = dto.keywords ?? latestVersion.keywords;
      await this.prisma.knowledgeVersion.update({
        where: { id: latestVersion.id },
        data: {
          title: newTitle,
          contentJson: newContent,
          rawContentJson: newRaw,
          keywords: newKeywords,
          contentText: this.buildContentText(newTitle, newContent as Prisma.JsonValue, newKeywords),
        },
      });
    }

    return this.prisma.knowledge.findUnique({
      where: { id },
      include: this.knowledgeDetailInclude,
    });
  }

  async findMy(userId: string) {
    return this.prisma.knowledge.findMany({
      where: { creatorId: userId },
      include: this.knowledgeDetailInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findPending() {
    return this.prisma.knowledge.findMany({
      where: { status: KnowledgeStatus.PENDING },
      include: this.knowledgeDetailInclude,
      orderBy: { updatedAt: 'asc' },
    });
  }

  async findPublished() {
    return this.prisma.knowledge.findMany({
      where: { status: KnowledgeStatus.PUBLISHED },
      include: this.knowledgeDetailInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(user: { id: string; role: Role }, id: string) {
    const knowledge = await this.prisma.knowledge.findUnique({
      where: { id },
      include: this.knowledgeDetailInclude,
    });
    if (!knowledge) throw new NotFoundException('知识不存在');

    if (knowledge.status === KnowledgeStatus.PUBLISHED) {
      return knowledge;
    }
    const isCreator = knowledge.creatorId === user.id;
    const isReviewer = user.role === Role.PM || user.role === Role.MANAGER;
    if (!isCreator && !isReviewer) {
      throw new ForbiddenException('无权查看该知识');
    }
    return knowledge;
  }

  // ============ AI 整理 ============

  async organize(dto: OrganizeKnowledgeDto) {
    if (!this.apiKey) {
      throw new BadRequestException('未配置 DeepSeek API Key');
    }

    const systemPrompt = ORGANIZE_PROMPT[dto.knowledgeType];
    const rawText = JSON.stringify(dto.rawContent ?? {}, null, 2);

    const userPrompt = `请整理以下原始内容：

${rawText}

请直接输出结构化 JSON，不要输出任何解释性文字。`;

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
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(`DeepSeek API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content || '';

    try {
      return JSON.parse(text.trim());
    } catch {
      // 尝试提取 JSON 片段
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          /* ignore */
        }
      }
      throw new BadRequestException('AI 整理结果解析失败，请重试');
    }
  }

  // ============ 提交审核 / 审核 ============

  async submit(userId: string, id: string) {
    const knowledge = await this.findOrThrow(id);
    if (knowledge.creatorId !== userId) {
      throw new ForbiddenException('只能提交自己创建的知识');
    }
    if (knowledge.status !== KnowledgeStatus.DRAFT) {
      throw new BadRequestException('仅草稿状态可提交审核');
    }
    return this.prisma.knowledge.update({
      where: { id },
      data: { status: KnowledgeStatus.PENDING },
    });
  }

  async review(userId: string, role: Role, id: string, dto: ReviewKnowledgeDto) {
    const knowledge = await this.findOrThrow(id);
    if (knowledge.status !== KnowledgeStatus.PENDING) {
      throw new BadRequestException('仅待审核状态可审核');
    }

    const latestVersion = await this.getLatestVersion(id);

    if (dto.approved) {
      // 审核通过：发布 V1
      await this.prisma.knowledge.update({
        where: { id },
        data: {
          status: KnowledgeStatus.PUBLISHED,
          reviewerId: userId,
          currentVersionId: latestVersion.id,
          lastConfirmedAt: new Date(),
        },
      });
      await this.prisma.knowledgeVersion.update({
        where: { id: latestVersion.id },
        data: { reviewerId: userId, reviewedAt: new Date() },
      });
    } else {
      // 退回：回到草稿，记录退回原因
      await this.prisma.knowledge.update({
        where: { id },
        data: { status: KnowledgeStatus.DRAFT, reviewerId: userId },
      });
      if (dto.reason) {
        await this.prisma.knowledgeVersion.update({
          where: { id: latestVersion.id },
          data: { changeReason: dto.reason },
        });
      }
    }

    return this.findOne({ id: userId, role }, id);
  }

  // ============ AI 知识问答 ============

  async ask(userId: string, dto: AskKnowledgeDto) {
    const question = (dto.question || '').trim();
    if (!question) throw new BadRequestException('问题不能为空');
    if (!this.apiKey) throw new BadRequestException('未配置 DeepSeek API Key');

    // 权限继承：受限知识仅 PM/MANAGER 可被检索使用
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const permissionLevels: KnowledgePermission[] =
      user && (user.role === Role.PM || user.role === Role.MANAGER)
        ? [KnowledgePermission.NORMAL, KnowledgePermission.RESTRICTED]
        : [KnowledgePermission.NORMAL];

    const published = await this.prisma.knowledge.findMany({
      where: { status: KnowledgeStatus.PUBLISHED, permissionLevel: { in: permissionLevels } },
      include: { currentVersion: true },
    });

    // 检索打分：关键词命中 + 标题/正文二元组命中率
    const scored = published
      .map((k) => ({
        knowledge: k,
        score: this.scoreKnowledge(question, {
          title: k.title,
          contentText: k.currentVersion?.contentText || '',
          keywords: k.currentVersion?.keywords || [],
        }),
      }))
      .filter((s) => s.score >= 2.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const source = dto.source || 'performance_system';

    // 未检索到可回答知识：返回统一话术并记录问答日志
    if (scored.length === 0) {
      const noAnswer = '当前部门知识库暂未检索到相关已审核知识，建议联系相关模块负责人确认。';
      await this.prisma.knowledgeQuestionLog.create({
        data: {
          userId,
          question,
          answer: noAnswer,
          matchedKnowledgeIds: [],
          matched: false,
          source,
        },
      });
      return { answer: noAnswer, sources: [], matched: false };
    }

    // 拼接正式知识上下文，调用大模型作答
    const context = scored
      .map(
        ({ knowledge: k }, i) =>
          `【知识${i + 1}】《${k.title}》版本 V${k.currentVersion?.version ?? 1}\n${k.currentVersion?.contentText || ''}`,
      )
      .join('\n\n');

    const userPrompt = `【正式知识】\n${context}\n\n【员工问题】\n${question}`;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: ASK_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(`DeepSeek API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer: string = data.choices?.[0]?.message?.content || '';

    // 命中知识使用次数 +1
    await this.prisma.$transaction(
      scored.map(({ knowledge: k }) =>
        this.prisma.knowledge.update({
          where: { id: k.id },
          data: { usageCount: { increment: 1 } },
        }),
      ),
    );

    // 记录问答日志
    await this.prisma.knowledgeQuestionLog.create({
      data: {
        userId,
        question,
        answer,
        matchedKnowledgeIds: scored.map((s) => s.knowledge.id),
        matched: true,
        source,
      },
    });

    return {
      answer,
      matched: true,
      sources: scored.map(({ knowledge: k }) => ({
        knowledgeId: k.id,
        title: k.title,
        version: `V${k.currentVersion?.version ?? 1}`,
        updatedAt: k.updatedAt,
      })),
    };
  }

  // ============ 知识缺口 ============

  private get gapInclude(): Prisma.KnowledgeGapInclude {
    return {
      systemModule: true,
      module: true,
      submitter: { select: { id: true, name: true, username: true } },
      handler: { select: { id: true, name: true, username: true } },
      knowledge: { select: { id: true, title: true, status: true } },
    };
  }

  async createGap(userId: string, dto: CreateKnowledgeGapDto) {
    if (!dto.question?.trim()) throw new BadRequestException('缺口问题不能为空');
    return this.prisma.knowledgeGap.create({
      data: {
        question: dto.question.trim(),
        systemModuleId: dto.systemModuleId || null,
        moduleId: dto.moduleId || null,
        submitterId: userId,
      },
      include: this.gapInclude,
    });
  }

  async listGaps(user: { id: string; role: Role }, status?: KnowledgeGapStatus) {
    const isManager = user.role === Role.PM || user.role === Role.MANAGER;
    return this.prisma.knowledgeGap.findMany({
      where: {
        ...(status ? { status } : {}),
        // 普通员工只能看到自己提交的缺口
        ...(isManager ? {} : { submitterId: user.id }),
      },
      include: this.gapInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateGap(
    user: { id: string; role: Role },
    id: string,
    dto: UpdateKnowledgeGapDto,
  ) {
    const gap = await this.prisma.knowledgeGap.findUnique({ where: { id } });
    if (!gap) throw new NotFoundException('知识缺口不存在');

    const data: Prisma.KnowledgeGapUncheckedUpdateInput = { handlerId: user.id };
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === KnowledgeGapStatus.RESOLVED || dto.status === KnowledgeGapStatus.CONVERTED) {
        data.resolvedAt = new Date();
      }
    }
    if (dto.handleNote !== undefined) data.handleNote = dto.handleNote;

    return this.prisma.knowledgeGap.update({ where: { id }, data, include: this.gapInclude });
  }

  async convertGap(user: { id: string; role: Role }, id: string, knowledgeId: string) {
    const gap = await this.prisma.knowledgeGap.findUnique({ where: { id } });
    if (!gap) throw new NotFoundException('知识缺口不存在');
    const knowledge = await this.prisma.knowledge.findUnique({ where: { id: knowledgeId } });
    if (!knowledge) throw new NotFoundException('关联的知识不存在');

    return this.prisma.knowledgeGap.update({
      where: { id },
      data: {
        status: KnowledgeGapStatus.CONVERTED,
        knowledgeId,
        handlerId: user.id,
        resolvedAt: new Date(),
      },
      include: this.gapInclude,
    });
  }

  // ============ 辅助 ============

  // 提取中文二元组（用于无分词环境下的文本匹配）
  private extractGrams(text: string): string[] {
    const clean = (text || '').replace(/[？?！!。，、；：""''\s]/g, '');
    const grams = new Set<string>();
    for (let i = 0; i < clean.length - 1; i++) grams.add(clean.slice(i, i + 2));
    return [...grams];
  }

  // 检索打分：关键词命中（权重5） + 标题命中率（权重4） + 正文命中率（权重3）
  private scoreKnowledge(
    question: string,
    k: { title: string; contentText: string; keywords: string[] },
  ): number {
    let score = 0;
    for (const kw of k.keywords || []) {
      if (kw && question.includes(kw)) score += 5;
    }
    const qGrams = this.extractGrams(question);
    if (!qGrams.length) return score;
    const titleGrams = new Set(this.extractGrams(k.title));
    let titleHit = 0;
    for (const g of qGrams) if (titleGrams.has(g)) titleHit++;
    score += (titleHit / qGrams.length) * 4;
    if (k.contentText) {
      let bodyHit = 0;
      for (const g of qGrams) if (k.contentText.includes(g)) bodyHit++;
      score += (bodyHit / qGrams.length) * 3;
    }
    return score;
  }

  private async findOrThrow(id: string) {
    const knowledge = await this.prisma.knowledge.findUnique({ where: { id } });
    if (!knowledge) throw new NotFoundException('知识不存在');
    return knowledge;
  }

  private async getLatestVersion(knowledgeId: string) {
    const version = await this.prisma.knowledgeVersion.findFirst({
      where: { knowledgeId },
      orderBy: { version: 'desc' },
    });
    if (!version) throw new NotFoundException('知识版本文档不存在');
    return version;
  }

  private buildContentText(
    title: string,
    content: Prisma.JsonValue | Prisma.InputJsonValue | null,
    keywords: string[],
  ): string {
    const parts: string[] = [title];
    if (content != null) {
      parts.push(JSON.stringify(content));
    }
    if (keywords?.length) {
      parts.push(keywords.join(' '));
    }
    return parts.join('\n');
  }

  private get knowledgeDetailInclude(): Prisma.KnowledgeInclude {
    return {
      systemModule: true,
      module: true,
      creator: { select: { id: true, name: true, username: true } },
      reviewer: { select: { id: true, name: true, username: true } },
      currentVersion: true,
      versions: { orderBy: { version: 'desc' } },
    };
  }
}

// 类型与 DTO（内联定义，保持与现有 issue 模块风格一致）
interface CreateKnowledgeDto {
  title: string;
  knowledgeType: KnowledgeType;
  systemModuleId?: string;
  moduleId?: string;
  permissionLevel?: KnowledgePermission;
  content?: unknown;
  rawContent?: unknown;
  keywords?: string[];
}

interface UpdateKnowledgeDto {
  title?: string;
  knowledgeType?: KnowledgeType;
  systemModuleId?: string;
  moduleId?: string;
  permissionLevel?: KnowledgePermission;
  content?: unknown;
  rawContent?: unknown;
  keywords?: string[];
}

interface OrganizeKnowledgeDto {
  knowledgeType: KnowledgeType;
  rawContent?: unknown;
}

interface ReviewKnowledgeDto {
  approved: boolean;
  reason?: string;
}

interface AskKnowledgeDto {
  question: string;
  source?: string; // performance_system / wecom
}

interface CreateKnowledgeGapDto {
  question: string;
  systemModuleId?: string;
  moduleId?: string;
}

interface UpdateKnowledgeGapDto {
  status?: KnowledgeGapStatus;
  handleNote?: string;
}