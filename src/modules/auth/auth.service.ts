import { Injectable } from '@nestjs/common';
import { AuthRepository } from './auth.repo.js';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}
  async login(payload: { username: string; password: string }) {
    const data = await this.authRepo.getUserByUsername(payload.username);
    if (!data) return null;
    const isPasswordMatch = await bcrypt.compare(
      payload.password,
      data.passwordHash,
    );
    if (!isPasswordMatch) return null;
    const {passwordHash, ...extracted} = data
    return extracted;
  }
}
