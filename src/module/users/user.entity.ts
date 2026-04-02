import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user.types';
import { Conversation } from '../chat/entities/conversation.entity';
import { Participant } from '../chat/entities/participant.entity';
import { Message } from '../chat/entities/message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @OneToMany(() => Conversation, (conversation) => conversation.creator, {
    cascade: true,
  })
  conversations: Conversation[];

  @OneToMany(() => Participant, (participant) => participant.user, {
    cascade: true,
  })
  participants: Participant[];

  @OneToMany(() => Message, (message) => message.sender, {
    cascade: true,
  })
  messages: Message[];
}
