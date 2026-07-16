import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  async getTaskConfig() {
    let config = await this.prisma.taskConfig.findFirst();
    if (!config) {
      config = await this.prisma.taskConfig.create({
        data: { pmBonusRatio: 0.10 },
      });
    }
    return config;
  }

  async updateTaskConfig(userId: string, pmBonusRatio: number) {
    const config = await this.getTaskConfig();
    return this.prisma.taskConfig.update({
      where: { id: config.id },
      data: { pmBonusRatio, updatedBy: userId },
    });
  }

  async getSystemModules() {
    return this.prisma.systemModule.findMany({
      where: { status: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAllSystemModules() {
    return this.prisma.systemModule.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSystemModule(data: { name: string; code?: string; description?: string }) {
    return this.prisma.systemModule.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        status: true,
      },
    });
  }

  async updateSystemModule(id: string, data: { name?: string; code?: string; description?: string; status?: boolean }) {
    return this.prisma.systemModule.update({
      where: { id },
      data,
    });
  }

  async deleteSystemModule(id: string) {
    return this.prisma.systemModule.delete({
      where: { id },
    });
  }
}
