import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateMarketingLeadDto {
  @ApiProperty({ example: 'Ferreteria La Principal' })
  @IsString()
  @MaxLength(180)
  businessName: string;

  @ApiProperty({ required: false, example: 'Carlos Perez' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  contactName?: string;

  @ApiProperty({ required: false, example: 'ventas@ferreterialaprincipal.com' })
  @ValidateIf((dto) => Boolean(dto.email))
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ required: false, example: '+573001112233' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ required: false, example: 'Cucuta' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiProperty({ required: false, example: 'Ferreterias' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ required: false, example: 'google_places' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceUrl?: string;

  @ApiProperty({ required: false, enum: ['unknown', 'corporate_public', 'opted_in', 'opted_out'] })
  @IsOptional()
  @IsIn(['unknown', 'corporate_public', 'opted_in', 'opted_out'])
  consentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
