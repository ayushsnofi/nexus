import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaService {
  private readonly kafka: Kafka;

  constructor(private readonly config: ConfigService) {
    const brokers = (
      this.config.get<string>('KAFKA_BROKERS') ?? 'localhost:9092'
    )
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    this.kafka = new Kafka({
      clientId: this.config.get<string>('KAFKA_CLIENT_ID') ?? 'nexus-backend',
      brokers,
    });
    this.producer = this.kafka.producer();
  }

  private readonly producer: ReturnType<Kafka['producer']>;

  async onModuleInit() {
    await this.producer.connect();
  }

  async emit(topic: string, event: any) {
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.data.conversationId || 'default',
          value: JSON.stringify(event),
        },
      ],
    });
    console.log(`Emitted event to topic ${topic}: ${JSON.stringify(event)}`);
  }
}
