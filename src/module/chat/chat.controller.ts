import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth.types';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('chat')
export class ChatController {
  
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.createConversation(createConversationDto, req.user.userId);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  getUserConversations(@Req() req: AuthenticatedRequest) {
    return this.chatService.getUserConversations(req.user.userId);
  }

  @Get('conversations/:id/messages')
  @UseGuards(JwtAuthGuard)
  async getConversationMessages(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getConversationMessages(id, req.user.userId, cursor);
  }

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  sendMessage(@Body() dto: SendMessageDto, @Req() req: AuthenticatedRequest) {
    return this.chatService.sendMessage(dto, req.user.userId);
  }
}