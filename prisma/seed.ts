import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { EmployeeType } from '../src/generated/prisma/enums.js';

const DEMO_PASSWORD = 'Passw0rd!';
const BCRYPT_ROUNDS = 10;

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check your .env file.');
}

if (process.env['NODE_ENV'] === 'production') {
  throw new Error('Refusing to seed demo data in production.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type AddressSeed = {
  countryName: string;
  countryCode: string;
  governorate: string;
  city: string;
  street: string;
  buildingNumber: string;
  postalCode?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  additionalInformation?: string;
};

type BranchSeed = {
  name: string;
  slug: string;
  code: string;
  address: AddressSeed;
};

type EmployeeSeed = {
  name: string;
  username: string;
  email: string;
  phone: string;
  type: EmployeeType;
  branchSlug: string;
};

const TENANT = {
  name: 'CrystalPay',
  slug: 'crystalpay',
  code: 'CRYSTALPAY',
  email: 'info@crystalpay.demo',
  phone: '+20225551000',
  logo: 'https://placehold.co/256x256/0f172a/ffffff?text=CrystalPay',
  clientId: 'crystalpay-demo-client',
  clientSecret: 'crystalpay-demo-secret',
};

const BRANCHES: BranchSeed[] = [
  {
    name: 'CrystalPay Headquarter',
    slug: 'headquarter',
    code: 'HQ',
    address: {
      countryName: 'Egypt',
      countryCode: 'EG',
      governorate: 'Cairo',
      city: 'New Cairo',
      street: 'North 90th Street',
      buildingNumber: '120',
      postalCode: '11835',
      floor: '7',
      apartment: '701',
      landmark: 'Opposite Cairo Festival City Mall',
      additionalInformation: 'Main offices and finance department.',
    },
  },
  {
    name: 'CrystalPay Makram',
    slug: 'makram',
    code: 'MKR',
    address: {
      countryName: 'Egypt',
      countryCode: 'EG',
      governorate: 'Cairo',
      city: 'Nasr City',
      street: 'Makram Ebeid Street',
      buildingNumber: '48',
      postalCode: '11765',
      floor: '2',
      apartment: '12',
      landmark: 'Next to Genena Mall',
      additionalInformation: 'Retail branch with two merchant terminals.',
    },
  },
];

const EMPLOYEES: EmployeeSeed[] = [
  {
    name: 'Nour Abdelrahman',
    username: 'nour.admin',
    email: 'nour.admin@crystalpay.demo',
    phone: '+20100000001',
    type: EmployeeType.ADMIN,
    branchSlug: 'headquarter',
  },
  {
    name: 'Omar Hassan',
    username: 'omar.merchant',
    email: 'omar.merchant@crystalpay.demo',
    phone: '+20100000002',
    type: EmployeeType.MERCHANT,
    branchSlug: 'makram',
  },
];

async function main() {
  const now = new Date();

  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT.slug },
    update: {
      name: TENANT.name,
      email: TENANT.email,
      phone: TENANT.phone,
      logo: TENANT.logo,
    },
    create: { ...TENANT, activatedAt: now },
  });

  console.log(`tenant  ${tenant.slug} (${tenant.id})`);

  const branchIdBySlug = new Map<string, string>();

  for (const branch of BRANCHES) {
    const existing = await prisma.branch.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: branch.slug } },
      select: { id: true },
    });

    if (existing) {
      branchIdBySlug.set(branch.slug, existing.id);
      console.log(`branch  ${branch.slug} (${existing.id}) — already present`);
      continue;
    }

    // Branch.addressId is a required 1-1, so the address is created inline.
    const created = await prisma.branch.create({
      data: {
        name: branch.name,
        slug: branch.slug,
        code: branch.code,
        activatedAt: now,
        tenant: { connect: { id: tenant.id } },
        address: {
          create: {
            ...branch.address,
            tenant: { connect: { id: tenant.id } },
          },
        },
      },
      select: { id: true },
    });

    branchIdBySlug.set(branch.slug, created.id);
    console.log(`branch  ${branch.slug} (${created.id}) — created with address`);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  for (const employee of EMPLOYEES) {
    const branchId = branchIdBySlug.get(employee.branchSlug);
    if (!branchId) {
      throw new Error(`Branch "${employee.branchSlug}" was not seeded.`);
    }

    const record = await prisma.employee.upsert({
      where: {
        tenantId_username: { tenantId: tenant.id, username: employee.username },
      },
      update: {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        type: employee.type,
        branch: { connect: { id: branchId } },
      },
      create: {
        name: employee.name,
        username: employee.username,
        email: employee.email,
        phone: employee.phone,
        type: employee.type,
        passwordHash,
        activatedAt: now,
        tenant: { connect: { id: tenant.id } },
        branch: { connect: { id: branchId } },
      },
      select: { id: true, username: true, type: true },
    });

    console.log(
      `employee ${record.username} (${record.type}) -> ${employee.branchSlug}`,
    );
  }

  console.log(`\nDemo login password for every seeded employee: ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
