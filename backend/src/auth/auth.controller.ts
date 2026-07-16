import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  captchaId: string;

  @IsString()
  captchaAnswer: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: '密码必须包含字母和数字' })
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: '密码必须包含字母和数字' })
  newPassword: string;
}

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('captcha')
  @SkipThrottle()
  async getCaptcha() {
    return this.authService.generateCaptcha();
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const valid = this.authService.validateCaptcha(dto.captchaId, dto.captchaAnswer);
    if (!valid) {
      throw new BadRequestException('验证码错误，请重新获取');
    }
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@Request() req) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }
}
