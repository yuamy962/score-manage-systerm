import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { IssueScoreController } from './issue-score.controller';
import { IssueScoreService } from './issue-score.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [PrismaModule, ScoresModule],
  controllers: [IssuesController, IssueScoreController],
  providers: [IssuesService, IssueScoreService],
})
export class IssuesModule {}
