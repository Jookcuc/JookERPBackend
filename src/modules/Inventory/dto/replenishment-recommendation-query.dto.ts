import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { DemandForecastQueryDto } from './demand-forecast-query.dto';

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

export class ReplenishmentRecommendationQueryDto extends DemandForecastQueryDto {
  @ApiPropertyOptional({
    example: 7,
    default: 7,
    description: 'Dias promedio que tarda el proveedor en entregar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  leadTimeDays?: number = 7;

  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description:
      'Dias que se busca cubrir despues de recibir el reabastecimiento',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  reviewPeriodDays?: number = 30;

  @ApiPropertyOptional({
    example: 0.95,
    default: 0.95,
    description: 'Nivel de servicio objetivo para calcular stock de seguridad',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(0.99)
  serviceLevel?: number = 0.95;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Retorna solo productos que requieren reabastecimiento',
  })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  onlyNeedsReorder?: boolean = false;

  @ApiPropertyOptional({
    example: 50,
    default: 50,
    description: 'Cantidad maxima de recomendaciones a retornar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
