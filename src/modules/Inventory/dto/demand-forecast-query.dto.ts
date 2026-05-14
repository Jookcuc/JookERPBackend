import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'yes', 'si'].includes(
    String(value).trim().toLowerCase(),
  );
}

export class DemandForecastQueryDto {
  @ApiPropertyOptional({
    example: 12,
    description: 'Filtra el pronostico a un producto especifico',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Filtra el pronostico por categoria de producto',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  typeId?: number;

  @ApiPropertyOptional({
    example: 180,
    default: 180,
    description:
      'Dias historicos a analizar cuando no se envian startDate/endDate',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(14)
  @Max(1095)
  historyDays?: number = 180;

  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: 'Dias futuros a pronosticar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  forecastDays?: number = 30;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Fecha inicial del historico (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-04-30',
    description: 'Fecha final del historico (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Incluye la serie historica diaria en la respuesta',
  })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  includeHistory?: boolean = false;
}
