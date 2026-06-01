import { PartialType } from '@nestjs/swagger';
import { CreateMarketingLeadDto } from './create-marketing-lead.dto';

export class UpdateMarketingLeadDto extends PartialType(CreateMarketingLeadDto) {}
