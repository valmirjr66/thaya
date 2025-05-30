import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        cors: true,
    });

    app.setGlobalPrefix('api').useGlobalPipes(new ValidationPipe());

    const config = new DocumentBuilder()
        .setTitle('Thaya Assistant API')
        .setDescription(
            "This is a RESTful API created to interface with Thaya's intelligence.",
        )
        .setVersion('1.0')
        .addTag('Assistant')
        .addTag('User')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    const swaggerDarkTheme = new SwaggerTheme().getBuffer(
        SwaggerThemeNameEnum.DARK,
    );

    SwaggerModule.setup('ui', app, document, {
        customCss: swaggerDarkTheme,
    });

    const apiPort = process.env.API_PORT || 8080;

    await app.listen(apiPort);

    console.log(`\nAPI running on port ${apiPort}`);
    console.log(`Swagger documentation available on /ui\n`);
}

bootstrap();
