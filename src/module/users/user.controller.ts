import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { RateLimiterGaurd } from 'src/common/gaurds/rateLimiter.gaurd';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(RateLimiterGaurd)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

    @Get()
    @UseGuards(RateLimiterGaurd)
    list(@Query() listUsersDto: ListUsersDto) {
    return this.userService.list(listUsersDto);
    }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
 