import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceType, InvoiceStatus } from '../entities/invoice.entity';

export class InvoiceItemDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 3, description: 'Cantidad' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 555.00, description: 'Precio unitario' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ enum: InvoiceType, example: InvoiceType.COMPRA })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiProperty({ example: 'FAC-0001', description: 'Número de factura' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ example: 1, description: 'ID del contacto (proveedor o cliente)' })
  @IsInt()
  contactId: number;

  @ApiProperty({ example: '2025-07-10' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2025-08-10', description: 'Fecha de vencimiento' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, example: InvoiceStatus.PENDIENTE })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: 'Pago a 30 días' })
  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @ApiPropertyOptional({ example: 'https://example.com/voucher.pdf' })
  @IsOptional()
  @IsString()
  voucherUrl?: string;

  @ApiProperty({ type: [InvoiceItemDto], description: 'Productos de la factura' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}