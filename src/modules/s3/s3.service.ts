import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-2');
    this.bucket = this.configService.get<string>(
      'AWS_BUCKET',
      'jook-erp-bucket',
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async generatePresignedUrl(
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; imageUrl: string }> {
    try {
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/\s+/g, '-').toLowerCase();
      const key = `images/${timestamp}-${sanitizedFilename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300, // 5 minutos
      });

      const imageUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`Presigned URL generada para: ${key}`);

      return { uploadUrl, imageUrl };
    } catch (error: any) {
      this.logger.error(
        `Error generando presigned URL: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'No se pudo generar la URL de subida',
      );
    }
  }
}
