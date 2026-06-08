import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectMaterialDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiProperty({ example: 1, description: 'ID del producto del inventario' })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 100, description: 'Cantidad estimada a usar' })
  @IsNumber()
  @Min(0)
  estimatedQuantity: number;

  @ApiProperty({ example: 25.5, description: 'Costo unitario estimado', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedUnitCost?: number;

  @ApiProperty({ example: 'Tornillos para estructura principal', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProjectMaterialDto extends PartialType(CreateProjectMaterialDto) {}
