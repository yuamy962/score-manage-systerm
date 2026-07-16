import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';

const WEAK_PASSWORDS = ['admin123', 'pm123', 'member123', '123456', 'password', 'qwerty', 'abc123'];

interface CaptchaItem {
  answer: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private captchaStore = new Map<string, CaptchaItem>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {
    const secret = this.config.get<string>('JWT_SECRET') || '';
    if (!secret || secret === 'your-super-secret-jwt-key-change-this-in-production' || secret.length < 32) {
      console.error('⚠️  JWT_SECRET 不安全！请在 .env 中设置至少32位的随机密钥');
      if (this.config.get('NODE_ENV') === 'production') {
        throw new Error('生产环境必须配置安全的 JWT_SECRET（至少32位随机字符）');
      }
    }
  }

  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operators = ['+', '-'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let answer: number;
    if (operator === '+') {
      answer = num1 + num2;
    } else {
      answer = num1 - num2;
    }

    const captchaId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    this.captchaStore.set(captchaId, {
      answer: String(answer),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return {
      captchaId,
      question: `${num1} ${operator} ${num2} = ?`,
    };
  }

  validateCaptcha(captchaId: string, answer: string): boolean {
    const item = this.captchaStore.get(captchaId);
    if (!item) return false;

    this.captchaStore.delete(captchaId);

    if (Date.now() > item.expiresAt) return false;
    return item.answer === answer.trim();
  }

  async login(username: string, password: string) {
    if (!username) {
      throw new UnauthorizedException('用户名不能为空');
    }
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (!user.status) {
      throw new UnauthorizedException('账号已被禁用');
    }
    const isValid = await bcrypt.compare(password, user.password || '');
    if (!isValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = this.jwt.sign({ sub: user.id, username: user.username });
    const isWeakPassword = WEAK_PASSWORDS.includes(password);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        mustChangePassword: isWeakPassword,
      },
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');

    const isValid = await bcrypt.compare(oldPassword, user.password || '');
    if (!isValid) throw new BadRequestException('旧密码不正确');

    if (WEAK_PASSWORDS.includes(newPassword)) {
      throw new BadRequestException('新密码不能是常见弱密码');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.audit.log({
      userId,
      action: 'CHANGE_PASSWORD',
      resource: 'user',
      resourceId: userId,
      detail: `用户 ${user.username} 修改了自己的密码`,
    });
    return { message: '密码修改成功' };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, role: true },
    });
  }
}
