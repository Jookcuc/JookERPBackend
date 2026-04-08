import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty({
    example: 'factura.pdf',
    description: 'Nombre del archivo a subir',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type del archivo',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(image\/(jpeg|jpg|png|webp|gif|svg\+xml)|application\/pdf)$/, {
    message: 'contentType debe ser una imagen valida o application/pdf',
  })
  contentType: string;

  @ApiPropertyOptional({
    example: 'employees/contracts',
    description: 'Directorio destino dentro del bucket para guardar el archivo',
  })
  @IsOptional()
  @IsString()
  directory?: string;
}
