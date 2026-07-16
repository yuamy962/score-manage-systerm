import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('徽章成就')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('badges')
export class BadgesController {
  constructor(private badgesService: BadgesService) {}

  @Get('definitions')
  async getDefinitions() {
    return this.badgesService.getBadgeDefinitions();
  }

  @Get('my')
  async myBadges(@Request() req) {
    return this.badgesService.getAllBadgesWithStatus(req.user.id);
  }

  @Get('user/:userId')
  async userBadges(@Param('userId') userId: string) {
    return this.badgesService.getAllBadgesWithStatus(userId);
  }
}
