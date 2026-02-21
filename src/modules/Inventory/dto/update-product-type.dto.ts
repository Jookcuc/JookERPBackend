import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductTypeDto {
  @ApiPropertyOptional({ example: 'ELEC-002', description: 'Nuevo código del tipo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Electrónica y Gadgets', description: 'Nuevo nombre de la categoría' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}