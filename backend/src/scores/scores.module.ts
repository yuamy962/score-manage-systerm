import { Module } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { BadgesModule } from '../badges/badges.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [BadgesModule, NotificationModule],
  providers: [ScoresService],
  controllers: [ScoresController],
  exports: [ScoresService],
})
export class ScoresModule {}
