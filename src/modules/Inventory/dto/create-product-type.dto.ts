import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductTypeDto {
  @ApiProperty({ example: 'ELEC-001', description: 'Código único del tipo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Electronica', description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}