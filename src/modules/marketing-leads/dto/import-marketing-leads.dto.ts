import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMarketingLeadDto } from './create-marketing-lead.dto';

export class ImportMarketingLeadsDto {
  @ApiProperty({ type: [CreateMarketingLeadDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateMarketingLeadDto)
  leads: CreateMarketingLeadDto[];
}
