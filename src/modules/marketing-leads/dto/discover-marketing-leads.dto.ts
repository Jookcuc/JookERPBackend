import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const LEAD_DISCOVERY_CATEGORIES = [
  'restaurants',
  'retail',
  'pharmacies',
  'supermarkets',
  'hardware',
  'beauty',
  'hotels',
] as const;

export class DiscoverMarketingLeadsDto {
  @ApiProperty({ required: false, example: 'Cucuta' })
  @IsOptional()
  @IsString()
  city?: string = 'Cucuta';

  @ApiProperty({
    required: false,
    enum: LEAD_DISCOVERY_CATEGORIES,
    isArray: true,
    example: ['restaurants', 'hardware', 'supermarkets'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsIn(LEAD_DISCOVERY_CATEGORIES, { each: true })
  categories?: Array<(typeof LEAD_DISCOVERY_CATEGORIES)[number]>;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxResults?: number = 50;
}
