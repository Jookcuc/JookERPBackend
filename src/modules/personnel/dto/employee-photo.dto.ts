import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, Matches } from 'class-validator';

export class EmployeePhotoUploadUrlDto {
  @ApiProperty({
    example: 'foto-empleado.jpg',
    description: 'Nombre del archivo de imagen a subir',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type de la imagen (jpeg, png, webp)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^image\/(jpeg|jpg|png|webp)$/, {
    message:
      'contentType debe ser una imagen válida: image/jpeg, image/png o image/webp',
  })
  contentType: string;
}

export class UpdateEmployeePhotoDto {
  @ApiProperty({
    example: 'https://jook-erp-bucket.s3.us-east-2.amazonaws.com/employees/photos/1/...',
    description: 'URL permanente de la imagen en S3',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  photoUrl: string;
}
