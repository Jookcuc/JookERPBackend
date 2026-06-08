import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceItemInputDto } from './invoice-item-input.dto';

export class CreatePurchaseInvoiceDto {
  @ApiProperty({ example: 9, description: 'ID del proveedor' })
  @Type(() => Number)
  @IsInt()
  supplierId: number;

  @ApiProperty({ example: 'FC-0001', description: 'Numero de factura' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ example: '2026-03-03', description: 'Fecha de emision' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({
    example: '2026-03-18',
    description: 'Fecha de vencimiento',
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 180000, description: 'Monto total de la factura' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ example: 'Credito a 15 dias' })
  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @ApiPropertyOptional({
    example:
      'https://jook-erp-bucket.s3.us-east-2.amazonaws.com/images/invoices/purchases/support.jpg',
    description: 'URL de la imagen soporte subida previamente a S3',
  })
  @IsOptional()
  @IsString()
  voucherUrl?: string;

  @ApiProperty({
    type: [InvoiceItemInputDto],
    description: 'Productos incluidos en la factura',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items: InvoiceItemInputDto[];

  @ApiPropertyOptional({ example: 1, description: 'ID del proyecto' })
  @IsOptional()
  @IsInt()
  projectId?: number;
}

