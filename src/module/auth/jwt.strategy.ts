import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../users/user.service';
import { AuthService } from './auth.service';
import { AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'change-me-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const isRevoked = this.authService.isTokenRevoked(payload.jti);
    if (isRevoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer valid');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenId: payload.jti,
    };
  }
}
