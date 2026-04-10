import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus, example: InvoiceStatus.PAGADA })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    example: '2025-08-20',
    description: 'Debe ser mayor que la fecha de emision de la factura',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Pago a 60 días' })
  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @ApiPropertyOptional({ example: 'https://example.com/nuevo-voucher.pdf' })
  @IsOptional()
  @IsString()
  voucherUrl?: string;
}
