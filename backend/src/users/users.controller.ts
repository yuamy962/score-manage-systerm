import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from '../common/dto';

@ApiTags('用户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  @Get(':id')
  @Roles(Role.PM, Role.MANAGER)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.MANAGER)
  async create(@Body() dto: CreateUserDto, @Request() req) {
    return this.usersService.create(req.user.id, dto);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req) {
    return this.usersService.update(req.user.id, id, dto);
  }

  @Post(':id/reset-password')
  @Roles(Role.MANAGER)
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Request() req) {
    return this.usersService.resetPassword(req.user.id, id, dto.password);
  }
}
