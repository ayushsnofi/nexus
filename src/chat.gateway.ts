import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ): void {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    client.emit('joinedRoom', { room });
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody()
    payload: {
      room: string;
      sender: string;
      content: string;
    },
  ): void {
    this.server.to(payload.room).emit('message', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('notify')
  handleNotification(
    @MessageBody()
    payload: {
      target: string;
      type: string;
      data?: unknown;
    },
  ): void {
    void this.server.to(payload.target).emit('notification', payload);
  }
}
