import { Controller, Get, Post, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExtensionsService } from './extensions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApplyExtensionDto, ReviewExtensionDto, UpdatePenaltyConfigDto } from '../common/dto';

@ApiTags('延期申请')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('extensions')
export class ExtensionsController {
  constructor(private extensionsService: ExtensionsService) {}

  @Post('task/:taskId')
  async apply(
    @Param('taskId') taskId: string,
    @Request() req,
    @Body() dto: ApplyExtensionDto,
  ) {
    return this.extensionsService.apply(req.user.id, taskId, dto);
  }

  @Patch(':id/review')
  @Roles(Role.PM, Role.MANAGER)
  async review(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ReviewExtensionDto,
  ) {
    return this.extensionsService.review(id, req.user.id, dto.approved, dto.note);
  }

  @Get('task/:taskId')
  async getTaskExtensions(@Param('taskId') taskId: string) {
    return this.extensionsService.getTaskExtensions(taskId);
  }

  @Get('my')
  async getMyExtensions(@Request() req) {
    return this.extensionsService.getMyExtensions(req.user.id);
  }

  @Get('pending')
  @Roles(Role.PM, Role.MANAGER)
  async getPendingExtensions(@Request() req) {
    return this.extensionsService.getPendingExtensions(req.user.id);
  }

  @Get('monthly-count')
  async getMonthlyCount(@Request() req) {
    return this.extensionsService.getMonthlyExtensionCount(req.user.id);
  }

  @Get('penalty-config')
  async getPenaltyConfig() {
    return this.extensionsService.getPenaltyConfig();
  }

  @Patch('penalty-config')
  @Roles(Role.MANAGER)
  async updatePenaltyConfig(
    @Request() req,
    @Body() dto: UpdatePenaltyConfigDto,
  ) {
    return this.extensionsService.updatePenaltyConfig(req.user.id, dto);
  }
}
