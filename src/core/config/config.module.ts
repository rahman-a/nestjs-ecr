import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidate } from './env.validation.js';
import { AppConfigService } from './config.service.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      validate: envValidate,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
