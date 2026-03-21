import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UserService } from '../users/user.service';
import { JwtPayload } from './auth.types';
import { UserRole } from '../users/user.types';

@Injectable()
export class AuthService {
  private readonly revokedTokenJtis = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
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
    const user = this.userService.findByEmail(loginDto.email);
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

    this.userService.markLogin(user.id);
    const token = await this.generateAccessToken(user.id, user.email, user.role);

    return {
      user: this.userService.sanitizeUser(user),
      ...token,
    };
  }

  logout(token: string) {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    });

    this.cleanupRevokedTokens();
    this.revokedTokenJtis.set(payload.jti, payload.exp ?? this.getDefaultTokenExp());
    return { message: 'Logged out successfully' };
  }

  isTokenRevoked(jti: string): boolean {
    this.cleanupRevokedTokens();
    return this.revokedTokenJtis.has(jti);
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

  private cleanupRevokedTokens() {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.revokedTokenJtis.entries()) {
      if (exp <= now) {
        this.revokedTokenJtis.delete(jti);
      }
    }
  }

  private getDefaultTokenExp(): number {
    return Math.floor(Date.now() / 1000) + 3600;
  }
}
