import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateFeesDto {
  @ApiProperty({
    example: 1,
    description: 'ID del condominio al que se le generarán las cuotas.',
  })
  @IsNumber()
  condominiumId: number;

  @ApiProperty({
    example: '2026-05',
    description: 'Periodo de facturación en formato YYYY-MM.',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period: string;

  @ApiProperty({
    example: 1500000,
    description:
      'Monto total a distribuir o valor base por unidad, según el criterio configurado.',
  })
  @IsNumber()
  baseAmount: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'Si es `true`, distribuye el monto por coeficiente; si es `false`, usa el mismo valor base para todas las unidades.',
  })
  @IsBoolean()
  @IsOptional()
  useCoefficient?: boolean;
}
