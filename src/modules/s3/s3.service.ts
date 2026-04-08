import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadFileParams {
  key: string;
  body: Buffer;
  contentType: string;
  contentDisposition?: string;
}

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
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
    });
  }

  async generatePresignedUrl(
    filename: string,
    contentType: string,
    directory = 'images',
  ): Promise<{ uploadUrl: string; imageUrl: string }> {
    try {
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/\s+/g, '-').toLowerCase();
      const normalizedDirectory =
        directory.trim().replace(/^\/+|\/+$/g, '') || 'images';
      const key = `${normalizedDirectory}/${timestamp}-${sanitizedFilename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300,
      });

      const imageUrl = this.buildFileUrl(key);

      this.logger.log(`Presigned URL generada para: ${key}`);

      return { uploadUrl, imageUrl };
    } catch (error: unknown) {
      this.logger.error(
        `Error generando presigned URL: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException(
        'No se pudo generar la URL de subida',
      );
    }
  }

  async uploadFile({
    key,
    body,
    contentType,
    contentDisposition,
  }: UploadFileParams): Promise<{ key: string; fileUrl: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: contentDisposition,
      });

      await this.s3Client.send(command);

      this.logger.log(`Archivo subido a S3: ${key}`);

      return {
        key,
        fileUrl: this.buildFileUrl(key),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error subiendo archivo a S3: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException(
        'No se pudo subir el archivo a S3',
      );
    }
  }

  async generateDownloadUrl(
    key: string,
    filename: string,
    expiresIn = 3600,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${filename}"`,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return {
        downloadUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error generando download URL: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException(
        'No se pudo generar la URL de descarga',
      );
    }
  }

  async generateReadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<{ readUrl: string; expiresAt: string }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const readUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return {
        readUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error generando read URL: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException(
        'No se pudo generar la URL de lectura',
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Archivo eliminado de S3: ${key}`);
    } catch (error: unknown) {
      this.logger.error(
        `Error eliminando archivo de S3: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException(
        'No se pudo eliminar el archivo de S3',
      );
    }
  }

  extractKeyFromUrl(fileUrl: string): string | null {
    try {
      const parsedUrl = new URL(fileUrl);
      const host = parsedUrl.hostname.toLowerCase();
      const keyFromPath = decodeURIComponent(
        parsedUrl.pathname.replace(/^\/+/, ''),
      );

      if (!keyFromPath) {
        return null;
      }

      if (host.includes('.s3.') && host.endsWith('.amazonaws.com')) {
        const bucket = host.split('.s3.')[0];
        return bucket === this.bucket ? keyFromPath : null;
      }

      if (host.startsWith('s3.') && host.endsWith('.amazonaws.com')) {
        const [bucket, ...rest] = keyFromPath.split('/');
        if (bucket !== this.bucket || rest.length === 0) {
          return null;
        }

        return rest.join('/');
      }

      return null;
    } catch {
      return null;
    }
  }

  private buildFileUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
