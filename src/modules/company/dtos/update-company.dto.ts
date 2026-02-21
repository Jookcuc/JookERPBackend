import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Distribuidora López & Asociados C.A.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}