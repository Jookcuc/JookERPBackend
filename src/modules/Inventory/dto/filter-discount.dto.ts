import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FilterDiscountDto {
  @ApiPropertyOptional({ example: 'Promo', description: 'Buscar por nombre' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado activo',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }

    if (value === false || value === 'false' || value === 0 || value === '0') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Numero de pagina',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Resultados por pagina',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
