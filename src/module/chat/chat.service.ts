import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Participant } from "./entities/participant.entity";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { chatStatus, ParticipantType } from "./types";
import { SendMessageDto } from "./dto/send-message.dto";
import { User } from "../users/user.entity";

@Injectable()
export class ChatService{
    constructor(
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
        @InjectRepository(Participant)
        private readonly participantRepository: Repository<Participant>,
    ){}

    async createConversation(dto:CreateConversationDto,creatorId:string){
        // validate participant(no duplicates, include creator)
        const extraIds = dto.participantIds ?? [];
        const participants = [creatorId, ...extraIds];
        const uniqueParticipants = [...new Set(participants)];
        if(uniqueParticipants.length !== participants.length){
            throw new BadRequestException('Duplicate participants are not allowed');
        }

        const conversation = this.conversationRepository.create({
            name: dto.conversationName,
            description: dto.description,
            type: dto.type,
            creator: { id: creatorId },
        });

        const savedConversation = await this.conversationRepository.save(conversation);

        const participantRows = uniqueParticipants.map((userId) =>
            this.participantRepository.create({
                conversation: { id: savedConversation.id } as Conversation,
                user: { id: userId } as User,
                type:
                    userId === creatorId
                        ? ParticipantType.admin
                        : ParticipantType.member,
            }),
        );

        await this.participantRepository.save(participantRows);

        return savedConversation;
      }

    async getUserConversations(userId: string) {
console.log(userId);
        return await this.conversationRepository.find({
           where: [
            {
              participants: {
                user: {
                  id: userId,
                },
              },
            },
            {
              creator: {
                id: userId,
              },
            },
           ],
           order: {
            updatedAt: 'DESC'
           }
        })
      }

    async sendMessage(dto:SendMessageDto,senderId:string){
        const {conversationId,content}=dto;
        await this.validateUserAccess(conversationId,senderId);

        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['creator'],
        });

        if (!conversation) {
            throw new BadRequestException('Conversation not found');
        }

        const participant = await this.participantRepository.findOne({
            where: {
                conversation: { id: conversationId },
                user: { id: senderId },
            },
        });

        const isOwner = conversation.creator.id === senderId;
        console.log(isOwner,participant,conversation,senderId);
        if (!participant && !isOwner) {
            throw new BadRequestException('You are not a part of this conversation');
        }

        const message= await this.messageRepository.create({
            conversation: {id:conversationId} as Conversation,
            sender: {id:senderId} as User,
            content: content,
            status: chatStatus.sent,
        });

        await this.messageRepository.save(message);

        return message;
      }

    async getConversationMessages(conversationId:string,userId:string,cursor?:string){
        await this.validateUserAccess(conversationId,userId);
        return await this.messageRepository.find({
            where: {
                conversation: {id:conversationId},
            },
            order: {
                createdAt: 'DESC'
            },
        });
    }

    async validateUserAccess(conversationId: string, userId: string) {
        const participant = await this.participantRepository.findOne({
          where: { conversation: {id:conversationId}, user: {id:userId} },
        });
      
        if (!participant) {
          throw new ForbiddenException("You are not authorized to access this conversation");
        }
      }
} 