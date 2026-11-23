import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';


const employeeAuthSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  username: true,
  passwordHash: true,
  email: true,
  phone: true,
  activatedAt: true,
  type: true,
  tenant: {
    select: {
      id: true,
      rin: true,
      code: true,
      nameAr: true,
      nameEn: true,
      logo: true,
      logoPrinting: true,
      clientId: true,
      clientSecret: true,
    },
  },
  branch: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      code: true,
      rin: true,
      clientId: true,
      clientSecret: true,
      address: {
        select:{
          id:true,
          countryName: true,
          countryCode: true,
          governorate:true,
          city:true,
          street: true,
          buildingNumber: true,
          postalCode: true,
          floor: true,
          apartment: true,
          landmark: true,
          additionalInformation: true,
        }
      },
    },
  },
} satisfies Prisma.EmployeeSelect;

export type EmployeeAuth = Prisma.EmployeeGetPayload<{
  select: typeof employeeAuthSelect;
}>;



@Injectable({})
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}
  async getUserByEmail(email: string):Promise<EmployeeAuth | null> {
    return this.prismaService.employee.findUnique({
      where: {
        email,
      },
      select:employeeAuthSelect
    });
  }

  async getUserByUsername(username: string):Promise<EmployeeAuth | null> {
    return this.prismaService.employee.findFirst({
      where: {
        username,
      },
      select: employeeAuthSelect
    });


  }
}
