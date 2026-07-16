import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueScore, IssueScoreStatus, ScoreType, ScoreSourceType } from '@prisma/client';
import { ScoresService } from '../scores/scores.service';

@Injectable()
export class IssueScoreService {
  constructor(
    private prisma: PrismaService,
    private scoresService: ScoresService,
  ) {}

  async create(data: { issueId: string; requestedScore: number; reviewerId: string }): Promise<IssueScore> {
    return this.prisma.issueScore.create({
      data: {
        issueId: data.issueId,
        requestedScore: data.requestedScore,
        reviewerId: data.reviewerId,
        status: IssueScoreStatus.PENDING,
      },
    });
  }

  async findAll(userId?: string, status?: IssueScoreStatus): Promise<IssueScore[]> {
    const where: any = {};
    if (userId) {
      where.reviewerId = userId;
    }
    if (status) {
      where.status = status;
    }
    
    return this.prisma.issueScore.findMany({
      where,
      include: {
        issue: {
          include: {
            creator: true,
            systemModule: true,
          },
        },
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<IssueScore | null> {
    return this.prisma.issueScore.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            creator: true,
            systemModule: true,
          },
        },
        reviewer: true,
      },
    });
  }

  async findByIssueId(issueId: string): Promise<IssueScore | null> {
    return this.prisma.issueScore.findUnique({
      where: { issueId },
    });
  }

  async update(id: string, data: { approvedScore?: number; status: IssueScoreStatus; remark?: string }, reviewerId: string): Promise<IssueScore> {
    const updateData: any = {
      status: data.status,
      reviewerId,
    };
    
    if (data.approvedScore !== undefined) {
      updateData.approvedScore = data.approvedScore;
    }
    
    if (data.remark) {
      updateData.remark = data.remark;
    }
    
    const issueScore = await this.prisma.issueScore.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            creator: true,
          },
        },
      },
    });
    
    if (!issueScore) {
      throw new Error('积分申请记录不存在');
    }
    
    if (data.status === IssueScoreStatus.APPROVED && data.approvedScore !== undefined && data.approvedScore > 0) {
      return this.prisma.$transaction(async (tx) => {
        const updatedScore = await tx.issueScore.update({
          where: { id },
          data: updateData,
        });
        
        await this.scoresService.createRecord(reviewerId, 'MANAGER', {
          targetUserId: issueScore.issue.creator.id,
          type: ScoreType.OPS,
          score: data.approvedScore,
          reason: `问题处理 - ${issueScore.issue.title}`,
          sourceType: ScoreSourceType.OTHER,
          sourceName: '问题管理',
        });
        
        return updatedScore;
      });
    }
    
    return this.prisma.issueScore.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<IssueScore> {
    return this.prisma.issueScore.delete({
      where: { id },
    });
  }
}
