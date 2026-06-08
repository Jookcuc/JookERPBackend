import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaterialConsumptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiProperty({ example: 1, description: 'ID del producto consumido' })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 25, description: 'Cantidad realmente consumida' })
  @IsNumber()
  @Min(0)
  quantityUsed: number;

  @ApiProperty({ example: 'Se usaron 25 unidades para el muro norte', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaterialConsumptionDto extends PartialType(CreateMaterialConsumptionDto) {}
