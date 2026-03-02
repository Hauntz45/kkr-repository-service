import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

/**
 * Application Entry Point.
 *
 * Responsibilities:
 * 1. Bootstrap the NestJS application context.
 * 2. Configure global pipes (Validation).
 * 3. Setup Swagger (OpenAPI) documentation for API consumers.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation for DTOs
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('KKR Portfolio Intelligence')
    .setDescription(
      'A robust ETL pipeline that scrapes, enriches, and indexes KKR portfolio companies. ' +
        'Features include AI-driven categorization (LLM), metadata extraction, and idempotent storage.',
    )
    .setVersion('1.0')
    .addTag('Scraper', 'ETL Operations (Extraction & Load)')
    .addTag('Companies', 'Data Retrieval & Search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger UI is available at: ${await app.getUrl()}/api`);
}
bootstrap();
