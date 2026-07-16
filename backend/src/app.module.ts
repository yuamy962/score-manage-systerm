import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ScoresModule } from './scores/scores.module';
import { AppealsModule } from './appeals/appeals.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationModule } from './notification/notification.module';
import { BadgesModule } from './badges/badges.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TaskConfigModule } from './config/config.module';
import { IssuesModule } from './issues/issues.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    TasksModule,
    IssuesModule,
    ScoresModule,
    AppealsModule,
    NotificationModule,
    BadgesModule,
    ExtensionsModule,
    ReviewsModule,
    TaskConfigModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
