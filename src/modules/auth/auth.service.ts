import { Injectable } from '@nestjs/common';
import { AuthRepository } from './auth.repo.js';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}
  async login(data: { username: string; password: string }) {
    const user = await this.authRepo.getUserByUsername(data.username);
    if (!user) return null;
    const isPasswordMatch = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!isPasswordMatch) return null;
    return user;
  }
}
