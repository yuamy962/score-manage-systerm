import { Controller, Get, Post, Body, Put, Delete, Param, Request, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('问题管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('issues')
export class IssuesController {
  constructor(private issuesService: IssuesService) {}

  @Post()
  async create(@Body() body: {
    title: string;
    description: string;
    systemModuleId?: string;
    occurredAt: string;
    resolvedAt?: string;
    hoursSpent: number;
    category: string;
    remark?: string;
  }, @Request() req) {
    return this.issuesService.create({
      title: body.title,
      description: body.description,
      systemModuleId: body.systemModuleId || undefined,
      occurredAt: new Date(body.occurredAt),
      resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : undefined,
      hoursSpent: body.hoursSpent,
      category: body.category as any,
      remark: body.remark || undefined,
      createdBy: req.user.id,
    });
  }

  @Get()
  async findAll(@Request() req, @Query('userId') userId?: string) {
    if (req.user.role === Role.MEMBER) {
      return this.issuesService.findAll(req.user.id);
    }
    return this.issuesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: {
    title?: string;
    description?: string;
    systemModuleId?: string;
    occurredAt?: string;
    resolvedAt?: string;
    hoursSpent?: number;
    category?: string;
    remark?: string;
  }) {
    return this.issuesService.update(id, {
      title: body.title,
      description: body.description,
      systemModuleId: body.systemModuleId || undefined,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : undefined,
      hoursSpent: body.hoursSpent,
      category: body.category as any,
      remark: body.remark,
    });
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  async delete(@Param('id') id: string) {
    return this.issuesService.delete(id);
  }
}
