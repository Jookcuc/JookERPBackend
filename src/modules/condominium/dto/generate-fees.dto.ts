import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class StructuralUnitFeeAllocationDto {
  @ApiProperty({
    example: 14,
    description:
      'ID de la unidad estructural a la que se le asignara presupuesto.',
  })
  @Type(() => Number)
  @IsInt()
  structuralUnitId: number;

  @ApiProperty({
    example: 600000,
    description:
      'Monto total asignado a esta unidad estructural para el periodo.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Si es `true`, reparte el monto usando coeficientes de las unidades privadas de esta unidad estructural. Si es `false`, reparte en partes iguales.',
  })
  @IsOptional()
  @IsBoolean()
  useCoefficient?: boolean;
}

export class GenerateFeesDto {
  @ApiProperty({
    example: 1,
    description: 'ID del condominio al que se le generaran las cuotas.',
  })
  @Type(() => Number)
  @IsInt()
  condominiumId: number;

  @ApiProperty({
    example: '2026-05',
    description: 'Periodo de facturacion en formato YYYY-MM.',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period: string;

  @ApiPropertyOptional({
    example: 1500000,
    description:
      'Monto global esperado del periodo. Si se envia, debe coincidir con la suma de los montos asignados por unidad estructural.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiProperty({
    type: [StructuralUnitFeeAllocationDto],
    description:
      'Distribucion del presupuesto mensual por torre, bloque, manzana o etapa.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StructuralUnitFeeAllocationDto)
  structuralUnitAllocations: StructuralUnitFeeAllocationDto[];
}
