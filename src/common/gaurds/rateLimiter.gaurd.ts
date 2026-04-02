import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()

export class RateLimiterGaurd implements CanActivate {
    constructor(private readonly redisService: RedisService) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const ip=request.ip;
        const route=request.route.path;
        console.log("IP:",ip);
        console.log("Route:",route);
        const key=`rate-limit:${ip}:${route}`;
        const limit=10;
        const ttl=60;

        const isLimited=await this.redisService.isRateLimited(key,limit,ttl);

        if(isLimited){
            throw new HttpException({
                status:HttpStatus.TOO_MANY_REQUESTS,
                error:"Too many requests",

            },HttpStatus.TOO_MANY_REQUESTS);
        }
        console.log("Rate limit not exceeded");
        return true;
    } 
}