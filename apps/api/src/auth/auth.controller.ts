import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(4, 6)
  pin!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.phone, body.pin);
  }

  @Get('me')
  me(@Headers('authorization') auth?: string) {
    const token = auth?.replace('Bearer ', '') ?? '';
    return this.authService.me(token);
  }
}
