import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Distribuidora López C.A.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}