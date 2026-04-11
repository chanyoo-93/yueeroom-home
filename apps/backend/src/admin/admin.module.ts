import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
