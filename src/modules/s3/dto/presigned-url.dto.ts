import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty({ example: 'foto.jpg', description: 'Nombre del archivo a subir' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: 'image/jpeg', description: 'MIME type del archivo' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/, {
    message: 'contentType debe ser un tipo de imagen válido (image/jpeg, image/png, image/webp, image/gif, image/svg+xml)',
  })
  contentType: string;
}
