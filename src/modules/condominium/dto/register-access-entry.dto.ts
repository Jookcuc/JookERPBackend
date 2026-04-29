import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RegisterAccessEntryDto {
  @ApiProperty({
    example: 120,
    description: 'ID de la unidad privada que autoriza o recibe la visita.',
  })
  @IsInt()
  unitId: number;

  @ApiProperty({
    example: 'Carlos Mendoza',
    description: 'Nombre completo del visitante.',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'CC-1029384756',
    description: 'Documento de identidad del visitante.',
  })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({
    example: 'ABC123',
    description: 'Placa del vehículo del visitante, si aplica.',
  })
  @IsOptional()
  @IsString()
  plate?: string;
}
