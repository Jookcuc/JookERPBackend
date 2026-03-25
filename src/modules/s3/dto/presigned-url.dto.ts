import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

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
}
