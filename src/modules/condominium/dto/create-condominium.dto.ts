import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
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
    example: 85.5,
    description: 'Area de la unidad privada en metros cuadrados.',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({
    example: 2.35,
    description: 'Coeficiente de copropiedad de la unidad.',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  coefficientPercentage?: number;

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
    example: 'Torre A',
    description: 'Nombre de la unidad estructural del condominio.',
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
      'Unidades privadas que se crearan dentro de esta torre, bloque o etapa.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyUnitDto)
  propertyUnits?: CreatePropertyUnitDto[];
}

export class CreateCondominiumDto {
  @ApiProperty({
    example: 'Edificio Parque Central',
    description: 'Nombre comercial o identificador principal del condominio.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Calle 10 # 45-20',
    description: 'Direccion fisica del condominio.',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: '900.123.456-1',
    description: 'NIT o documento tributario asociado al condominio.',
  })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({
    example: '6012345678',
    description: 'Telefono de contacto administrativo.',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'admin@parquecentral.com',
    description: 'Correo de contacto del condominio.',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: { currency: 'COP', timezone: 'America/Bogota' },
    description:
      'Configuracion adicional libre del condominio en formato JSON.',
  })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({
    type: [CreateStructuralUnitDto],
    description:
      'Torres, bloques, etapas o manzanas a crear junto con el condominio.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStructuralUnitDto)
  structuralUnits?: CreateStructuralUnitDto[];
}
