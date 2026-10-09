import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3042;
  await app.listen(port, '0.0.0.0');
  console.log(`Worker listening on port ${port}`);
}

bootstrap();
