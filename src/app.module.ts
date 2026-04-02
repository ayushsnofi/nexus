import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from './module/auth/auth.module';
import { ChatModule } from './module/chat/chat.module';
import { UsersModule } from './module/users/users.module';
import { RedisModule } from './redis/redis.module';
import { RateLimiterGaurd } from './common/gaurds/rateLimiter.gaurd';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'nexus',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UsersModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway, RateLimiterGaurd],
})
export class AppModule {}
