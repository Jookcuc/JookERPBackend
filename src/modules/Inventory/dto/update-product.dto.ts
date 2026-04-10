import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

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

  @ApiPropertyOptional({ example: 220.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 599.0 })
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

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description:
      'ID del descuento del catalogo. Envia null para quitar el descuento actual',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? value : parsedValue;
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  discountId?: number | null;

  @ApiPropertyOptional({
    example: '10%',
    deprecated: true,
    description:
      'Campo legado. Si envias discountId, el backend calcula este valor automaticamente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
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
