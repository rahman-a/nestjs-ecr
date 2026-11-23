import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

@Injectable({})
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}
  async getUserByEmail(email: string) {
    return this.prismaService.employee.findUnique({
      where: {
        email,
      },
    });
  }

  async getUserByUsername(username: string) {
    return this.prismaService.employee.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
        name: true,
        username: true,
        passwordHash: true,
        email: true,
        phone: true,
        activatedAt: true,
        type: true,
        tenantId: true,
      },
    });
  }
}
