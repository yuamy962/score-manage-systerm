import { Controller, Post, Get, Put, Delete, Param, Body, Request, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IssueScoreService } from './issue-score.service';
import { IssueScoreStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('问题积分')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('issue-scores')
export class IssueScoreController {
  constructor(private readonly issueScoreService: IssueScoreService) {}

  @Post()
  async create(@Body() body: { issueId: string; requestedScore: number; reviewerId: string }, @Request() req) {
    const existing = await this.issueScoreService.findByIssueId(body.issueId);
    if (existing) {
      throw new Error('该问题已存在积分申请');
    }
    
    if (body.requestedScore < 0.5 || body.requestedScore > 5) {
      throw new Error('积分申请额度必须在0.5到5之间');
    }
    
    return this.issueScoreService.create({
      issueId: body.issueId,
      requestedScore: body.requestedScore,
      reviewerId: body.reviewerId,
    });
  }

  @Get()
  async findAll(@Request() req, @Query('status') status?: IssueScoreStatus) {
    if (req.user.role === Role.MEMBER) {
      return this.issueScoreService.findAll();
    }
    return this.issueScoreService.findAll(req.user.id, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.issueScoreService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.PM, Role.MANAGER)
  async update(@Param('id') id: string, @Body() body: { approvedScore?: number; status: IssueScoreStatus; remark?: string }, @Request() req) {
    return this.issueScoreService.update(id, body, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.issueScoreService.delete(id);
  }
}
