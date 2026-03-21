import { UserRole } from '../users/user.types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  tokenId: string;
}
