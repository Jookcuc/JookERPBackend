import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceItemInputDto } from './invoice-item-input.dto';

export class CreateSalesInvoiceDto {
  @ApiProperty({ example: 12, description: 'ID del cliente' })
  @Type(() => Number)
  @IsInt()
  clientId: number;

  @ApiProperty({ example: '2026-03-03', description: 'Fecha de emision' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2026-03-18', description: 'Fecha de vencimiento' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 'FV-0001', description: 'Numero de factura' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ example: 250000, description: 'Monto total de la factura' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ enum: InvoiceStatus, example: InvoiceStatus.PENDIENTE })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: 'Pago a 30 dias' })
  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'ID del banco asociado a la transaccion de la venta',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bankId?: number;

  @ApiProperty({
    type: [InvoiceItemInputDto],
    description: 'Productos incluidos en la factura',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items: InvoiceItemInputDto[];
}
