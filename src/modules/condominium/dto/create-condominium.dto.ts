import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'Dirección física del condominio.',
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
    description: 'Teléfono de contacto administrativo.',
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
      'Configuración adicional libre del condominio en formato JSON.',
  })
  @IsOptional()
  @IsObject()
  config?: any;
}
