import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { ConversationType } from "../types";

export class CreateConversationDto{
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    userId: string;

    @IsNotEmpty()
    @IsString()
    conversationName:string;

    @IsNotEmpty()
    @IsString()
    description:string;

    @IsNotEmpty()
    @IsArray()
    @IsOptional()
    participantIds:string[]

    @IsNotEmpty()
    @IsEnum(ConversationType)
    type: ConversationType;
}