import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { adminUrl, integerSetting } from './config.js';

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
app.setGlobalPrefix('api/v1');
app.enableCors({
  origin: adminUrl().origin,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
});
await app.listen(integerSetting('PORT', 3000, 65535));
