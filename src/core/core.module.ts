import { Module, Global } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Global()
@Module({
  imports: [AppConfigModule, PrismaModule],
  exports: [AppConfigModule, PrismaModule],
})
export class CoreModule {}
