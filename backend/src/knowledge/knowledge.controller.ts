import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role, KnowledgeType, KnowledgePermission, KnowledgeGapStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { KnowledgeService } from './knowledge.service';

@ApiTags('知识中心')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  // ============ 知识模块（二级模块）基础数据 ============

  @Get('modules')
  async listModules(@Query('systemModuleId') systemModuleId?: string) {
    return this.knowledgeService.listModules(systemModuleId);
  }

  @Get('modules/all')
  @Roles(Role.MANAGER)
  async listAllModules() {
    return this.knowledgeService.listAllModules();
  }

  @Post('modules')
  @Roles(Role.MANAGER)
  async createModule(@Body() body: { systemModuleId: string; name: string; sortOrder?: number }) {
    return this.knowledgeService.createModule(body);
  }

  @Put('modules/:id')
  @Roles(Role.MANAGER)
  async updateModule(
    @Param('id') id: string,
    @Body() body: { name?: string; sortOrder?: number; status?: boolean },
  ) {
    return this.knowledgeService.updateModule(id, body);
  }

  @Delete('modules/:id')
  @Roles(Role.MANAGER)
  async deleteModule(@Param('id') id: string) {
    return this.knowledgeService.deleteModule(id);
  }

  // ============ 知识 CRUD ============

  @Post()
  async create(
    @Body()
    body: {
      title: string;
      knowledgeType: KnowledgeType;
      systemModuleId?: string;
      moduleId?: string;
      permissionLevel?: KnowledgePermission;
      content?: unknown;
      rawContent?: unknown;
      keywords?: string[];
    },
    @Request() req,
  ) {
    return this.knowledgeService.create(req.user.id, body);
  }

  @Post('organize')
  async organize(@Body() body: { knowledgeType: KnowledgeType; rawContent?: unknown }) {
    return this.knowledgeService.organize(body);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Request() req) {
    return this.knowledgeService.submit(req.user.id, id);
  }

  @Post(':id/review')
  @Roles(Role.PM, Role.MANAGER)
  async review(
    @Param('id') id: string,
    @Body() body: { approved: boolean; reason?: string },
    @Request() req,
  ) {
    return this.knowledgeService.review(req.user.id, req.user.role, id, body);
  }

  @Get('my')
  async findMy(@Request() req) {
    return this.knowledgeService.findMy(req.user.id);
  }

  @Get('pending')
  @Roles(Role.PM, Role.MANAGER)
  async findPending() {
    return this.knowledgeService.findPending();
  }

  @Get('published')
  async findPublished() {
    return this.knowledgeService.findPublished();
  }

  // ============ AI 知识问答 ============

  @Post('ask')
  async ask(
    @Body() body: { question: string; source?: string },
    @Request() req,
  ) {
    return this.knowledgeService.ask(req.user.id, body);
  }

  // ============ 知识缺口 ============

  @Post('gaps')
  async createGap(
    @Body() body: { question: string; systemModuleId?: string; moduleId?: string },
    @Request() req,
  ) {
    return this.knowledgeService.createGap(req.user.id, body);
  }

  @Get('gaps')
  async listGaps(@Request() req, @Query('status') status?: KnowledgeGapStatus) {
    return this.knowledgeService.listGaps({ id: req.user.id, role: req.user.role }, status);
  }

  @Patch('gaps/:id')
  @Roles(Role.PM, Role.MANAGER)
  async updateGap(
    @Param('id') id: string,
    @Body() body: { status?: KnowledgeGapStatus; handleNote?: string },
    @Request() req,
  ) {
    return this.knowledgeService.updateGap({ id: req.user.id, role: req.user.role }, id, body);
  }

  @Post('gaps/:id/convert')
  @Roles(Role.PM, Role.MANAGER)
  async convertGap(
    @Param('id') id: string,
    @Body() body: { knowledgeId: string },
    @Request() req,
  ) {
    return this.knowledgeService.convertGap({ id: req.user.id, role: req.user.role }, id, body.knowledgeId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      knowledgeType?: KnowledgeType;
      systemModuleId?: string;
      moduleId?: string;
      permissionLevel?: KnowledgePermission;
      content?: unknown;
      rawContent?: unknown;
      keywords?: string[];
    },
    @Request() req,
  ) {
    return this.knowledgeService.update(req.user.id, id, body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.knowledgeService.findOne({ id: req.user.id, role: req.user.role }, id);
  }
}