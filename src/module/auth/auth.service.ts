import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UserService } from '../users/user.service';
import { JwtPayload } from './auth.types';
import { UserRole } from '../users/user.types';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  async signup(signupDto: SignupDto) {
    const user = await this.userService.create(signupDto);
    const token = await this.generateAccessToken(user.id, user.email, user.role);
    return {
      user,
      ...token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userService.markLogin(user.id);
    const token = await this.generateAccessToken(user.id, user.email, user.role);
    return {
      ...token,
      "message": "Logged in successfully",
    }
  }

  async logout(token: string) {
    const decoded = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    });
    const jti = decoded.jti;
    await this.redisService.redis.set(`revoked:${jti}`, 'true', { EX: 3600 });
    return { message: 'Logged out successfully' };
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const revoked = await this.redisService.redis.get(`revoked:${jti}`);
    return revoked === 'true';
  }

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    });
  }

  private async generateAccessToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ accessToken: string; tokenType: 'Bearer'; expiresIn: number }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      jti: randomUUID(),
    };

    const expiresIn = 3600;
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: `${expiresIn}s`,
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

}
