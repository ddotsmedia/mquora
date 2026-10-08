import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.WORKER_PORT || 3023;
  await app.listen(port, '0.0.0.0');
  console.log(`Worker listening on port ${port}`);
}

bootstrap();
