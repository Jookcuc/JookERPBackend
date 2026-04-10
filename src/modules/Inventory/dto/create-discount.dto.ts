import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty({ example: 'Promo Abril', description: 'Nombre del descuento' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 15,
    description: 'Porcentaje del descuento entre 0 y 100',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Indica si el descuento esta disponible para seleccion',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
