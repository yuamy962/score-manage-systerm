import { Controller, Get, Post, Body, Request, UseGuards, Put, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateTaskConfigDto } from '../common/dto';

@ApiTags('系统配置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get('task')
  async getTaskConfig() {
    return this.configService.getTaskConfig();
  }

  @Post('task')
  @Roles(Role.MANAGER)
  async updateTaskConfig(@Body() dto: UpdateTaskConfigDto, @Request() req) {
    return this.configService.updateTaskConfig(req.user.id, dto.pmBonusRatio);
  }

  @Get('system-modules')
  async getSystemModules() {
    return this.configService.getSystemModules();
  }

  @Get('system-modules/all')
  @Roles(Role.MANAGER)
  async getAllSystemModules() {
    return this.configService.getAllSystemModules();
  }

  @Post('system-modules')
  @Roles(Role.MANAGER)
  async createSystemModule(@Body() body: { name: string; code?: string; description?: string }) {
    return this.configService.createSystemModule(body);
  }

  @Put('system-modules/:id')
  @Roles(Role.MANAGER)
  async updateSystemModule(
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; description?: string; status?: boolean }
  ) {
    return this.configService.updateSystemModule(id, body);
  }

  @Delete('system-modules/:id')
  @Roles(Role.MANAGER)
  async deleteSystemModule(@Param('id') id: string) {
    return this.configService.deleteSystemModule(id);
  }
}
