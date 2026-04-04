import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { AuthService } from '../auth/auth.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  constructor(
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
  ) {}

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  async onModuleInit(): Promise<void> {
    await this.redisService.subscribe('chat:message', (data) => {
      const conversationId = data.conversationId as string | undefined;
      const message = data.message;
      if (!conversationId || message == null) return;

      this.server.to(conversationId).emit('new_message', message);
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;

      if (!token) return client.disconnect();

      const payload = this.authService.verifyToken(token);

      const isRevoked = await this.authService.isTokenRevoked(payload.jti);
      if (isRevoked) return client.disconnect();

      client.data.user = { id: payload.sub, ...payload };
      this.logger.log(`Client ${client.id} connected`);
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    try {
      this.checkUserAccess(client);
      const userId = client.data.user.id;

      this.logger.log(
        `Client ${client.id} sending message to conversation ${payload.conversationId}`,
      );

      // persist message
      const message = await this.chatService.sendMessage(
        { conversationId: payload.conversationId, content: payload.content },
        userId,
      );

      //  publish to Redis (NOT emit directly)
      await this.redisService.publish('chat:message', {
        conversationId: payload.conversationId,
        message,
      });
    } catch (err) {
      this.logger.error(
        `Send message failed  ${payload.conversationId}: ${err}`,
      );
      client.emit('send_message_failed', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    this.checkUserAccess(client);

    const userId = client.data.user.id;

    await this.chatService.validateUserAccess(conversationId, userId);

    client.join(conversationId);

    this.logger.log(
      `Client ${client.id} joined conversation ${conversationId}`,
    );
  }

  checkUserAccess(client: Socket) {
    if (!client.data.user?.id) throw new UnauthorizedException();
  }
}
