import { IsNotEmpty, IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateUseKeyDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa a la que pertenece la llave' })
  @IsInt()
  companyId: number;

  @ApiPropertyOptional({ example: 'JK', default: 'JK' })
  @IsOptional()
  @IsString()
  prefix?: string = 'JK';

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresDays?: number = 30;
}

export class GenerateMultipleKeysDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa a la que pertenecen las llaves' })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiPropertyOptional({ example: 'JK', default: 'JK' })
  @IsOptional()
  @IsString()
  prefix?: string = 'JK';

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresDays?: number = 30;
}

export interface GeneratedKeyDto {
  keyValue: string;
  expiresAt: Date | null;
  createdAt: Date;
  status: string;
  companyId: number;
}

export interface KeyError {
  index: number;
  error: string;
}