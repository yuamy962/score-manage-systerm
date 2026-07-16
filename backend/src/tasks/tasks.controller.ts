import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TaskStatus, Role } from '@prisma/client';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, ApproveTaskDto, ApproveClaimDto } from '../common/dto';

@ApiTags('任务管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('status') status?: TaskStatus,
    @Query('planFinishStart') planFinishStart?: string,
    @Query('planFinishEnd') planFinishEnd?: string,
  ) {
    if (userId && req.user.role === Role.MEMBER && req.user.id !== userId) {
      return { error: '无权查看他人任务' };
    }
    const filters = {
      assigneeId: assigneeId || undefined,
      creatorId: creatorId || undefined,
      status: status || undefined,
      planFinishStart: planFinishStart || undefined,
      planFinishEnd: planFinishEnd || undefined,
    };
    return this.tasksService.findAll(req.user.id, req.user.role, userId, filters);
  }

  @Get('pool')
  async findPoolTasks() {
    return this.tasksService.findPoolTasks();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.tasksService.findOne(id, req.user.id, req.user.role);
  }

  @Post()
  @Roles(Role.PM, Role.MANAGER)
  async create(@Body() dto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(req.user.id, dto);
  }

  @Post(':id/claim')
  async claimTask(@Param('id') id: string, @Request() req) {
    return this.tasksService.claimTask(id, req.user.id);
  }

  @Post(':id/approve-claim')
  @Roles(Role.PM, Role.MANAGER)
  async approveClaim(@Param('id') id: string, @Body() dto: ApproveClaimDto, @Request() req) {
    return this.tasksService.approveClaim(id, req.user.id, dto);
  }

  @Post(':id/reject-claim')
  @Roles(Role.PM, Role.MANAGER)
  async rejectClaim(@Param('id') id: string, @Request() req) {
    return this.tasksService.rejectClaim(id, req.user.id);
  }

  @Post(':id/cancel-claim')
  async cancelClaim(@Param('id') id: string, @Request() req) {
    return this.tasksService.cancelClaim(id, req.user.id);
  }

  @Post(':id/return-to-pool')
  async returnToPool(@Param('id') id: string, @Request() req) {
    return this.tasksService.returnToPool(id, req.user.id, req.user.role);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @Request() req,
  ) {
    return this.tasksService.updateStatus(id, req.user.id, req.user.role, dto.status, dto.finalDays);
  }

  @Patch(':id')
  @Roles(Role.PM, Role.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.update(id, req.user.id, req.user.role, dto);
  }

  @Delete(':id')
  @Roles(Role.PM, Role.MANAGER)
  async remove(@Param('id') id: string, @Request() req) {
    return this.tasksService.deleteTask(id, req.user.id, req.user.role);
  }

  @Post(':id/approve')
  @Roles(Role.PM, Role.MANAGER)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveTaskDto,
    @Request() req,
  ) {
    return this.tasksService.approveTask(id, req.user.id, dto.finalDays);
  }
}
