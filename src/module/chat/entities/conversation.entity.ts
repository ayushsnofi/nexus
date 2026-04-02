import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Message } from './message.entity';
import { Participant } from './participant.entity';
import { ConversationType } from '../types';
import { IsEnum } from 'class-validator';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({type: 'enum', enum: ConversationType})
  @IsEnum(ConversationType)
  type: ConversationType;

  @Column({ name: 'last_message_id', type: 'uuid', nullable: true })
  lastMessageId: string | null;

  @ManyToOne(() => User, (user) => user.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @OneToMany(() => Message, (message) => message.conversation, { cascade: true })
  messages: Message[];

  @OneToMany(() => Participant, (participant) => participant.conversation, {
    cascade: true,
  })
  participants: Participant[];

}
