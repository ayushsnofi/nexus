import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Participant } from './entities/participant.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Participant])],
  exports: [TypeOrmModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
