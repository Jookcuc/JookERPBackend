import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { InvoiceType } from '../entities/invoice.entity';

export class ExtractInvoiceDto {
  @ApiProperty({
    enum: InvoiceType,
    example: InvoiceType.COMPRA,
    description: 'Tipo de factura a extraer',
  })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiProperty({
    example:
      'https://jook-erp-bucket.s3.us-east-2.amazonaws.com/images/invoices/purchases/1742880012-factura.jpg',
    description: 'URL publica o accesible del soporte de la factura',
  })
  @IsUrl(
    {
      require_tld: false,
    },
    {
      message: 'voucherUrl debe ser una URL valida',
    },
  )
  voucherUrl: string;

  @ApiPropertyOptional({
    example: 'factura-compra-marzo.jpg',
    description: 'Nombre original del archivo, si el frontend lo conoce',
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}
