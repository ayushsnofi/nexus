import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType, SetOptions } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private subscriber: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    console.log(this.config.get<string>('REDIS_URL'));
    const url =
      this.config.get<string>('REDIS_URL') ??
      `redis://${this.config.get<string>('REDIS_HOST', 'localhost')}:${this.config.get<string>('REDIS_PORT', '6379')}`;

    this.client = createClient({ url });
    this.client.on('error', (err) =>
      this.logger.error(`Redis client error: ${err.message}`),
    );
    await this.client.connect();
    this.subscriber = this.client.duplicate();
    this.subscriber.on('error', (err) =>
      this.logger.error(`Redis subscriber error: ${err.message}`),
    );
    await this.subscriber.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber?.isOpen) {
      await this.subscriber.quit();
    }
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async isRateLimited(key: string, limit: number, ttl: number): Promise<boolean> {
    const now=Date.now();
    const windowStart=now-ttl*1000;
    const multi=this.client.multi();

    multi.zRemRangeByScore(key,0,windowStart); // remove old requests
    multi.zCard(key); // get current request count
    multi.zAdd(key,[{score:now,value:now.toString()}]);
    multi.expire(key,ttl); // set expiration time

    const result = await multi.exec();
    // node-redis v5 returns a flat array of replies per command, not [err, reply] tuples
    const currentRequestCount = Number(result[1]);

    return currentRequestCount >= limit;
  }

  /** Direct access for advanced commands (SET, GET, pub/sub, etc.). */
  get redis(): RedisClientType {
    return this.client;
  }
  async set(key: string, value: string, options?: SetOptions): Promise<void> {
    await this.client.set(key, value, options);
  }
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    const message =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    await this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    handler: (data: Record<string, unknown>) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel, (message) => {
      try {
        handler(JSON.parse(message) as Record<string, unknown>);
      } catch {
        this.logger.warn(`Invalid JSON on Redis channel ${channel}`);
      }
    });
  }
}
