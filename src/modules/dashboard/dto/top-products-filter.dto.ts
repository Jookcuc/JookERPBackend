import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DashboardFilterDto } from './dashboard-filter.dto';

export enum TopProductsMetric {
  QUANTITY = 'quantity',
  AMOUNT = 'amount',
}

export class TopProductsFilterDto extends DashboardFilterDto {
  @ApiPropertyOptional({
    enum: TopProductsMetric,
    default: TopProductsMetric.QUANTITY,
    description: 'Metrica para ordenar el top de productos',
  })
  @IsOptional()
  @IsEnum(TopProductsMetric)
  metric?: TopProductsMetric = TopProductsMetric.QUANTITY;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Cantidad maxima de productos a retornar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
