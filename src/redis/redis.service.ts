import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url =
      this.config.get<string>('REDIS_URL') ??
      `redis://${this.config.get<string>('REDIS_HOST', 'localhost')}:${this.config.get<string>('REDIS_PORT', '6379')}`;

    this.client = createClient({ url });
    this.client.on('error', (err) =>
      this.logger.error(`Redis client error: ${err.message}`),
    );
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  /** Direct access for advanced commands (SET, GET, pub/sub, etc.). */
  get redis(): RedisClientType {
    return this.client;
  }
}
