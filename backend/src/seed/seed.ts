import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({ imports: [PrismaModule, SeedModule] })
class SeedAppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedAppModule, {
    logger: ['log', 'error', 'warn'],
  });
  await app.get(SeedService).seed();
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
