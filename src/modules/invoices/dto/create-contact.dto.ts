import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType } from '../entities/contact.entity';

export class CreateContactDto {
  @ApiProperty({ enum: ContactType, example: ContactType.PROVEEDOR })
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty({ example: 'Distribuidora López C.A.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'contacto@lopez.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+58 414-1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Principal, Local 5, Caracas' })
  @IsOptional()
  @IsString()
  address?: string;
}