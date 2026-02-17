import { IsNotEmpty, IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateUseKeyDto {
  @ApiProperty({
    example: 'JK',
    description: 'Prefijo para la llave',
    default: 'JK',
  })
  @IsOptional()
  @IsString()
  prefix?: string = 'JK';

  @ApiProperty({
    example: 30,
    description: 'Días hasta que expire la llave',
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresDays?: number = 30;
}

export class GenerateMultipleKeysDto {
  @ApiProperty({
    example: 10,
    description: 'Cantidad de llaves a generar',
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiProperty({
    example: 'JK',
    description: 'Prefijo para las llaves',
    default: 'JK',
  })
  @IsOptional()
  @IsString()
  prefix?: string = 'JK';

  @ApiProperty({
    example: 30,
    description: 'Días hasta que expiren las llaves',
    default: 30,
  })
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
}

export interface KeyError {
  index: number;
  error: string;
}
