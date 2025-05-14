import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as crypto from 'crypto';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3000', 'https://crm-frontend-v7zf.onrender.com'],
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With'
    ],
    exposedHeaders: ['Authorization']
  });


  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('Restaurant Management API')
    .setDescription('API для управления ресторанами, сменами и заказами')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(5000);
}
bootstrap();
