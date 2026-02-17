import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const environment = configService.get<string>('NODE_ENV', 'development');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Jook ERP API')
    .setDescription('API REST para el sistema ERP Jook')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Endpoints de autenticación y registro')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  try {
    await app.listen(port);
    logger.log(`Aplicación corriendo en: http://localhost:${port}`);
  } catch (error) {
    logger.error('Error al arrancar la aplicación:', error);
  }


  logger.log(`Aplicación corriendo en: http://localhost:${port}`);
  logger.log(`Documentación Swagger: http://localhost:${port}/api/docs`);
  logger.log(`Entorno: ${environment}`);
}
bootstrap();