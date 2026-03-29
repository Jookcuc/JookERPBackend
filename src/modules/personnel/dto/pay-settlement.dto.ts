import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PaySettlementDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  bankId?: number;

  @ApiPropertyOptional({ example: 'Transferencia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  method?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'Pago liquidacion Laura Gomez' })
  @IsOptional()
  @IsString()
  description?: string;
}
