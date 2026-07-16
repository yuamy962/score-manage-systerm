import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { NotificationModule } from '../notification/notification.module';
import { ExtensionsModule } from '../extensions/extensions.module';
import { TaskConfigModule } from '../config/config.module';

@Module({
  imports: [NotificationModule, ExtensionsModule, TaskConfigModule],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
