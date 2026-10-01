import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  KnowledgeType,
  KnowledgeStatus,
  KnowledgePermission,
  Role,
  Prisma,
} from '@prisma/client';

// 三类知识模板对应的 AI 整理提示词
const ORGANIZE_PROMPT: Record<KnowledgeType, string> = {
  [KnowledgeType.BASIC]: `你是一名资深的电信业务知识整理专家。请把员工提供的"基础信息"原始内容整理成结构化知识。
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
要求：保留原始事实，不要编造；语言专业规范；关键词不少于3个。`,

  [KnowledgeType.OPERATION]: `你是一名资深的电信业务知识整理专家。请把员工提供的"操作流程"原始内容整理成结构化知识。
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
要求：保留原始步骤事实，不要编造；步骤要完整可执行；关键词不少于3个。`,

  [KnowledgeType.PROBLEM]: `你是一名资深的电信业务知识整理专家。请把员工提供的"问题经验"原始内容整理成结构化知识。
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
要求：保留原始事实，不要编造；解决方案要可复现；关键词不少于3个。`,
};

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

  // ============ 辅助 ============

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