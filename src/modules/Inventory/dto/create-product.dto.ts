import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'ID de la categoria del producto' })
  @IsInt()
  typeId: number;

  @ApiProperty({ example: 'SRK-666', description: 'Codigo unico del producto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    example: 'Tablet Samsung A9',
    description: 'Nombre del producto',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Tablet de 8 pulgadas, 4GB RAM, 64GB almacenamiento',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 201.0, description: 'Precio de compra' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ example: 555.0, description: 'Precio de venta' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Stock inicial',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number = 1;

  @ApiPropertyOptional({
    example: 3,
    description: 'Stock minimo antes de alerta',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number = 1;

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description: 'ID del descuento del catalogo a asociar al producto',
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
    example: 'No aplica',
    default: 'No aplica',
    deprecated: true,
    description:
      'Campo legado. Si envias discountId, el backend calcula este valor automaticamente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discount?: string = 'No aplica';

  @ApiPropertyOptional({ example: 'https://example.com/tablet.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: '2025-07-10',
    description: 'Fecha de ingreso (por defecto hoy)',
  })
  @IsOptional()
  @IsDateString()
  entryDate?: string;
}
