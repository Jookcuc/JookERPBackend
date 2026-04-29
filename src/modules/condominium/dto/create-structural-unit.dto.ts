import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  PropertyUnitStatus,
  PropertyUnitType,
} from '../entities/property-unit.entity';
import { StructuralUnitType } from '../entities/structural-unit.entity';

export class CreatePropertyUnitDto {
  @ApiProperty({
    example: '101',
    description: 'Numero o identificador visible de la unidad privada.',
  })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({
    enum: PropertyUnitType,
    example: PropertyUnitType.APARTAMENTO,
    description: 'Tipo de unidad privada.',
  })
  @IsOptional()
  @IsEnum(PropertyUnitType)
  type?: PropertyUnitType;

  @ApiPropertyOptional({
    enum: PropertyUnitStatus,
    example: PropertyUnitStatus.HABITADO,
    description: 'Estado actual de la unidad privada.',
  })
  @IsOptional()
  @IsEnum(PropertyUnitStatus)
  status?: PropertyUnitStatus;
}

export class CreateStructuralUnitDto {
  @ApiProperty({
    example: 1,
    description: 'ID del condominio al que pertenece la unidad estructural.',
  })
  @Type(() => Number)
  @IsInt()
  condominiumId: number;

  @ApiProperty({
    example: 'Torre A',
    description: 'Nombre de la unidad estructural.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    enum: StructuralUnitType,
    example: StructuralUnitType.TORRE,
    description: 'Clasificacion de la unidad estructural.',
  })
  @IsOptional()
  @IsEnum(StructuralUnitType)
  type?: StructuralUnitType;

  @ApiPropertyOptional({
    type: [CreatePropertyUnitDto],
    description:
      'Unidades privadas que se desean crear dentro de esta unidad estructural.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyUnitDto)
  propertyUnits?: CreatePropertyUnitDto[];
}
