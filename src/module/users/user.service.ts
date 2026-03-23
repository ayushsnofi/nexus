import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { SafeUser, UserRole } from './user.types';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      name: createUserDto.name,
      passwordHash,
      role: createUserDto.role ?? UserRole.USER,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);
    return this.toSafeUser(saved);
  }

  async list(listUsersDto: ListUsersDto) {
    const page = listUsersDto.page ?? 1;
    const limit = listUsersDto.limit ?? 10;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (listUsersDto.search) {
      const query = `%${listUsersDto.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :query OR LOWER(user.email) LIKE :query)',
        { query },
      );
    }

    if (listUsersDto.role) {
      qb.andWhere('user.role = :role', { role: listUsersDto.role });
    }

    if (listUsersDto.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', {
        isActive: listUsersDto.isActive,
      });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((u) => this.toSafeUser(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string): Promise<SafeUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined)
      user.isActive = updateUserDto.isActive;

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const saved = await this.userRepository.save(user);
    return this.toSafeUser(saved);
  }

  async remove(id: string): Promise<SafeUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const safeUser = this.toSafeUser(user);
    await this.userRepository.remove(user);
    return safeUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    return this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async markLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
