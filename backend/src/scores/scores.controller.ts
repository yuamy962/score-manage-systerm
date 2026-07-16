import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ScoresService } from './scores.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateScoreDto, UpdateScoreConfigDto } from '../common/dto';

@ApiTags('积分管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scores')
export class ScoresController {
  constructor(private scoresService: ScoresService) {}

  @Get('my')
  async myRecords(@Request() req, @Query('month') month?: string) {
    return this.scoresService.findMyRecords(req.user.id, month);
  }

  @Get('ranking')
  async ranking(@Query('month') month: string) {
    return this.scoresService.getMonthlyRanking(month);
  }

  @Get('ranking/pm')
  async pmRanking(@Query('month') month: string) {
    return this.scoresService.getPmRanking(month);
  }

  @Get('ranking/yearly')
  async yearlyRanking(@Query('year') year: string) {
    console.log('Controller: yearlyRanking called with year:', year, 'typeof:', typeof year);
    return this.scoresService.getYearlyRanking(year);
  }

  @Get('ranking/yearly/pm')
  async yearlyPmRanking(@Query('year') year: string) {
    console.log('Controller: yearlyPmRanking called with year:', year, 'typeof:', typeof year);
    return this.scoresService.getYearlyPmRanking(year);
  }

  @Get('all')
  @Roles(Role.PM, Role.MANAGER)
  async allRecords(@Query('month') month?: string) {
    return this.scoresService.findAllRecords(month);
  }

  @Get('user/:userId')
  @Roles(Role.PM, Role.MANAGER)
  async userRecords(@Param('userId') userId: string, @Query('month') month?: string, @Request() req?: any) {
    return this.scoresService.findUserRecords(req.user.id, req.user.role, userId, month);
  }

  @Post()
  async create(@Body() dto: CreateScoreDto, @Request() req) {
    return this.scoresService.createRecord(req.user.id, req.user.role, dto);
  }

  @Post(':id/approve')
  @Roles(Role.PM, Role.MANAGER)
  async approve(@Param('id') id: string, @Request() req) {
    return this.scoresService.approveRecord(id, req.user.id, req.user.role);
  }

  @Get('config')
  @Roles(Role.MANAGER)
  async getConfig() {
    return this.scoresService.getPerformanceConfigs();
  }

  @Post('config')
  @Roles(Role.MANAGER)
  async updateConfig(@Body() dto: UpdateScoreConfigDto, @Request() req) {
    return this.scoresService.updatePerformanceConfigs(req.user.id, req.user.role, dto.configs);
  }

  @Get('grade')
  async getGrade(@Query('score') score: string) {
    return this.scoresService.getPerformanceGrade(parseFloat(score));
  }

  @Get('my-progress')
  async myProgress(@Request() req) {
    return this.scoresService.getMyProgress(req.user.id);
  }

  @Get('role-comparison')
  async roleComparison(@Request() req) {
    return this.scoresService.getRoleComparison(req.user.id);
  }

  @Get('my-history')
  async myHistory(@Request() req) {
    return this.scoresService.getMyHistory(req.user.id);
  }

  @Get('user/:userId/history')
  @Roles(Role.PM, Role.MANAGER)
  async userHistory(@Param('userId') userId: string, @Request() req) {
    return this.scoresService.getMyHistory(userId);
  }

  @Get('user/:userId/progress')
  @Roles(Role.PM, Role.MANAGER)
  async userProgress(@Param('userId') userId: string, @Request() req) {
    return this.scoresService.getMyProgress(userId);
  }
}
