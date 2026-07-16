import { Controller, Get, Post, Patch, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, ReviewStyle } from '@prisma/client';
import { GenerateReviewDto, BatchGenerateReviewDto, UpdateReviewDto, BatchPublishDto } from '../common/dto';

@ApiTags('绩效评语')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post('generate')
  @Roles(Role.PM, Role.MANAGER)
  async generate(
    @Request() req,
    @Body() dto: GenerateReviewDto,
  ) {
    return this.reviewsService.generateReview(
      dto.userId,
      dto.month,
      dto.style || ReviewStyle.GENERAL,
      req.user.id,
    );
  }

  @Post('batch-generate')
  @Roles(Role.MANAGER)
  async batchGenerate(
    @Request() req,
    @Body() dto: BatchGenerateReviewDto,
  ) {
    return this.reviewsService.batchGenerateReviews(
      dto.month,
      dto.style || ReviewStyle.GENERAL,
      req.user.id,
    );
  }

  @Patch(':id')
  @Roles(Role.PM, Role.MANAGER)
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, dto.content, req.user.id);
  }

  @Post(':id/publish')
  @Roles(Role.PM, Role.MANAGER)
  async publish(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.reviewsService.publishReview(id, req.user.id);
  }

  @Post('batch-publish')
  @Roles(Role.MANAGER)
  async batchPublish(
    @Request() req,
    @Body() dto: BatchPublishDto,
  ) {
    return this.reviewsService.batchPublish(dto.month, req.user.id);
  }

  @Get('all')
  @Roles(Role.PM, Role.MANAGER)
  async getAllReviews(@Query('month') month: string) {
    return this.reviewsService.getAllReviews(month);
  }

  @Get('user/:userId')
  async getUserReviews(
    @Param('userId') userId: string,
    @Query('month') month?: string,
  ) {
    return this.reviewsService.getUserReviews(userId, month);
  }

  @Get('my')
  async getMyReviews(@Request() req, @Query('month') month?: string) {
    return this.reviewsService.getUserReviews(req.user.id, month);
  }

  @Get('my-drafts')
  async getMyDrafts(@Request() req, @Query('month') month?: string) {
    return this.reviewsService.getMyDrafts(req.user.id, month);
  }

  @Get(':userId/:month/:style')
  async getReview(
    @Param('userId') userId: string,
    @Param('month') month: string,
    @Param('style') style: ReviewStyle,
  ) {
    return this.reviewsService.getReview(userId, month, style);
  }
}
