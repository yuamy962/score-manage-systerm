import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppealsService } from './appeals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateAppealDto, ReviewAppealDto } from '../common/dto';

@ApiTags('申诉管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appeals')
export class AppealsController {
  constructor(private appealsService: AppealsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.appealsService.findAll(req.user.id, req.user.role);
  }

  @Post()
  async create(@Body() dto: CreateAppealDto, @Request() req) {
    return this.appealsService.create(req.user.id, dto);
  }

  @Patch(':id')
  async review(@Param('id') id: string, @Body() dto: ReviewAppealDto, @Request() req) {
    return this.appealsService.review(id, req.user.id, req.user.role, dto);
  }
}
