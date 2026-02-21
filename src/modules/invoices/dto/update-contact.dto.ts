import { IsString, IsOptional, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType } from '../entities/contact.entity';

export class UpdateContactDto {
  @ApiPropertyOptional({ enum: ContactType, example: ContactType.CLIENTE })
  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @ApiPropertyOptional({ example: 'Distribuidora López & Asociados' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'nuevo@lopez.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+58 424-7654321' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Secundaria, Piso 2, Caracas' })
  @IsOptional()
  @IsString()
  address?: string;
}