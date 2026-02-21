import { IsString, IsNumber, IsOptional, IsInt, Min, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  typeId?: number;

  @ApiPropertyOptional({ example: 'SRK-777' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Tablet Samsung A9 Plus' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Tablet de 10 pulgadas, 8GB RAM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 220.00 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 599.00 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: '10%' })
  @IsOptional()
  @IsString()
  discount?: string;

  @ApiPropertyOptional({ example: 'https://example.com/tablet-plus.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '2025-07-15' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;
}