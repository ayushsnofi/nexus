import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser, UserRecord, UserRole } from './user.types';

@Injectable()
export class UserService {
  private readonly users: UserRecord[] = [];

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existingUser = this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user: UserRecord = {
      id: randomUUID(),
      email: createUserDto.email.toLowerCase(),
      name: createUserDto.name,
      passwordHash,
      role: createUserDto.role ?? UserRole.USER,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    this.users.push(user);
    return this.sanitizeUser(user);
  }

  list(listUsersDto: ListUsersDto) {
    const page = listUsersDto.page ?? 1;
    const limit = listUsersDto.limit ?? 10;

    let data = [...this.users];

    if (listUsersDto.search) {
      const query = listUsersDto.search.toLowerCase();
      data = data.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }

    if (listUsersDto.role) {
      data = data.filter((user) => user.role === listUsersDto.role);
    }

    if (listUsersDto.isActive !== undefined) {
      data = data.filter((user) => user.isActive === listUsersDto.isActive);
    }

    data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = data.length;
    const start = (page - 1) * limit;
    const paginatedUsers = data.slice(start, start + limit).map((user) => this.sanitizeUser(user));

    return {
      data: paginatedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  getById(id: string): SafeUser {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    user.updatedAt = new Date().toISOString();
    return this.sanitizeUser(user);
  }

  remove(id: string) {
    const index = this.users.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('User not found');
    }

    const [deletedUser] = this.users.splice(index, 1);
    return this.sanitizeUser(deletedUser);
  }

  findByEmail(email: string): UserRecord | undefined {
    const normalizedEmail = email.toLowerCase();
    return this.users.find((user) => user.email === normalizedEmail);
  }

  findById(id: string): UserRecord | undefined {
    return this.users.find((user) => user.id === id);
  }

  markLogin(id: string): void {
    const user = this.findById(id);
    if (!user) {
      return;
    }
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
  }

  sanitizeUser(user: UserRecord): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
