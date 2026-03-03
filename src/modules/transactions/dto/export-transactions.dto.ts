import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ExportTransactionsDto {
  @ApiPropertyOptional({ enum: ['excel', 'xlsx', 'pdf'], default: 'excel' })
  @IsOptional()
  @IsIn(['excel', 'xlsx', 'pdf'])
  format?: 'excel' | 'xlsx' | 'pdf' = 'excel';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  movement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
