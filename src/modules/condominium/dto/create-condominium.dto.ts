import { IsString, IsOptional, IsNotEmpty, IsNumber, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCondominiumDto {
  @ApiProperty({ example: 'Edificio Parque Central' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Calle 10 # 45-20', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '900.123.456-1', required: false })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiProperty({ example: '6012345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'admin@parquecentral.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: { currency: 'COP' }, required: false })
  @IsOptional()
  config?: any;
}
