import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class InvoiceItemInputDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @Type(() => Number)
  @IsInt()
  productId: number;

  @ApiProperty({ example: 3, description: 'Cantidad del producto' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
