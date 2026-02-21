import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'ID de la categoría del producto' })
  @IsInt()
  typeId: number;

  @ApiProperty({ example: 'SRK-666', description: 'Código único del producto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Tablet Samsung A9', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Tablet de 8 pulgadas, 4GB RAM, 64GB almacenamiento' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 201.00, description: 'Precio de compra' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ example: 555.00, description: 'Precio de venta' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiPropertyOptional({ example: 10, description: 'Stock inicial', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number = 1;

  @ApiPropertyOptional({ example: 3, description: 'Stock mínimo antes de alerta', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number = 1;

  @ApiPropertyOptional({ example: 'No aplica', default: 'No aplica' })
  @IsOptional()
  @IsString()
  discount?: string = 'No aplica';

  @ApiPropertyOptional({ example: 'https://example.com/tablet.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '2025-07-10', description: 'Fecha de ingreso (por defecto hoy)' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;
}