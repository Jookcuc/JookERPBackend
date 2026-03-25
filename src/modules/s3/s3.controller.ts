import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { S3Service } from './s3.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@ApiTags('S3')
@ApiBearerAuth('JWT-auth')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Get('presigned-url')
  @ApiOperation({ summary: 'Generar presigned URL para subir archivos a S3' })
  @ApiResponse({
    status: 200,
    description: 'Retorna uploadUrl (temporal 5 min) e imageUrl (permanente)',
    schema: {
      example: {
        uploadUrl:
          'https://jook-erp-bucket.s3.us-east-2.amazonaws.com/images/factura.pdf?X-Amz-Signature=...',
        imageUrl:
          'https://jook-erp-bucket.s3.us-east-2.amazonaws.com/images/1234567890-factura.pdf',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 500, description: 'Error al generar la URL' })
  getPresignedUrl(@Query() query: PresignedUrlDto) {
    return this.s3Service.generatePresignedUrl(
      query.filename,
      query.contentType,
    );
  }
}
