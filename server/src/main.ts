import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para que el Frontend de tu compañero pueda hablarte
  app.enableCors({
    origin: true, // En producción esto se cambia por la URL real del frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Prefijo global para que todo sea /api/v1/...
  app.setGlobalPrefix('api/v1');
  
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();