import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module';
import { MarketingLead } from './entities/marketing-lead.entity';
import { MarketingLeadsController } from './marketing-leads.controller';
import { MarketingLeadsService } from './marketing-leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingLead]), EmailModule],
  controllers: [MarketingLeadsController],
  providers: [MarketingLeadsService],
  exports: [MarketingLeadsService],
})
export class MarketingLeadsModule {}
