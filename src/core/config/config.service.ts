import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from './env.validation.js';

type ConfigOptions = {
  throw: boolean;
};

@Injectable({})
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppEnv>) {}

  get<k extends keyof AppEnv>(key: k, ops?: Partial<ConfigOptions>): AppEnv[k] {
    return ops?.throw
      ? this.configService.getOrThrow(key)
      : (this.configService.get(key) as AppEnv[k]);
  }
}
