import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { EmployeeType } from '../src/generated/prisma/enums.js';

/**
 * Seeds one demo tenant with five branches, using device data from the legacy
 * Mongo export (crystalecr.users.json).
 *
 * The export holds real ETA credentials, so they are read at runtime and never
 * copied into this file. Override the source path with SEED_USERS_FILE.
 *
 * Credential fallback demo:
 *  - branches with `ownRin` carry their own rin + clientId/clientSecret
 *  - the others store null and fall back to the tenant's credentials
 */

const TENANT_RIN = '493812652';
const DEFAULT_USERS_FILE = 'ecr_collections/ecr_collections/crystalecr.users.json';
const DEFAULT_PASSWORD = 'passw0rd!';
const BCRYPT_ROUNDS = 10;

type BilingualName = { nameAr: string; nameEn: string };

const TENANT = {
  nameAr: 'كريستال ريتيل للتجارة والتوزيع',
  nameEn: 'Crystal Retail Trading & Distribution',
  code: 'CRYSTAL-RETAIL',
  activityCode: '4610',
  /** Legacy user whose ETA client id/secret become the tenant's credentials. */
  credentialsFrom: 'kh',
};

/** Legacy usernames were shop/terminal accounts, so employees get invented person names. */
const EMPLOYEE_NAMES: Record<string, BilingualName> = {
  mn: { nameAr: 'محمد عادل', nameEn: 'Mohamed Adel' },
  seller: { nameAr: 'كريم حسن', nameEn: 'Karim Hassan' },
  collector: { nameAr: 'مصطفى علي', nameEn: 'Mostafa Ali' },
  kh: { nameAr: 'خالد إبراهيم', nameEn: 'Khaled Ibrahim' },
  ay: { nameAr: 'يوسف أشرف', nameEn: 'Youssef Ashraf' },
  mk: { nameAr: 'أحمد سمير', nameEn: 'Ahmed Samir' },
};

type BranchConfig = BilingualName & {
  code: string;
  /** Legacy user that supplies the device, terminal, credentials and address. */
  source: string;
  /** Overrides the source's device serial (when two branches share a device). */
  deviceSerialNumber?: string;
  /** Set => branch has its own rin + credentials; unset => falls back to tenant. */
  ownRin?: string;
  /** Legacy usernames seeded as employees of this branch. */
  employees: string[];
};

// Processed in order: branch 1 must drop its old clientId before branch 5 takes it.
const BRANCHES: BranchConfig[] = [
  {
    code: '1',
    nameAr: 'فرع مدينة نصر',
    nameEn: 'Nasr City Branch',
    source: 'seller',
    employees: ['mn', 'seller'],
  },
  {
    code: '2',
    nameAr: 'فرع مدينة نصر - تحصيل',
    nameEn: 'Nasr City Branch - Collection',
    source: 'collector',
    ownRin: '512398746',
    employees: ['collector'],
  },
  {
    code: '3',
    nameAr: 'فرع بورتو كايرو مول',
    nameEn: 'Porto Cairo Mall Branch',
    source: 'kh',
    employees: ['kh'],
  },
  {
    code: '4',
    nameAr: 'فرع بورتو كايرو مول 2',
    nameEn: 'Porto Cairo Mall Branch 2',
    source: 'ay',
    ownRin: '587214930',
    employees: ['ay'],
  },
  {
    code: '5',
    nameAr: 'سوبر ماركت النور',
    nameEn: 'Al Nour Supermarket',
    source: 'mk',
    deviceSerialNumber: '654791', // mk shared device 654789 with branch 1 in the export
    ownRin: '534906172',
    employees: ['mk'],
  },
];

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check your .env file.');
}

if (process.env['NODE_ENV'] === 'production') {
  throw new Error('Refusing to seed demo data in production.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ---------------------------------------------------------------------------
// Legacy export shape (only the fields we use)
// ---------------------------------------------------------------------------

type MongoDate = { $date: string };

type LegacyAddress = {
  country: string;
  governate: string;
  regionCity: string;
  street: string;
  buildingNumber: string;
  postalCode?: string | null;
  floor?: string | null;
  room?: string | null;
  landmark?: string | null;
  additionalInformation?: string | null;
};

type LegacyMerchantData = {
  rin: string;
  branch_address: LegacyAddress;
  device_serial_number: string;
  terminal_id: string;
  client_id: string;
  client_secret: string;
  createdAt: MongoDate;
};

type LegacyUser = {
  name: string;
  username: string;
  type: 'Admin' | 'Partner' | 'Merchant';
  status: string;
  merchant_data?: LegacyMerchantData | null;
  createdAt: MongoDate;
};

type MerchantUser = LegacyUser & { merchant_data: LegacyMerchantData };

const COUNTRY_NAMES: Record<string, string> = { EG: 'Egypt' };

const toDate = (d: MongoDate) => new Date(d.$date);

/** Empty strings and nulls in the export become undefined (omitted). */
const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

function loadMerchantsByUsername(): Map<string, MerchantUser> {
  const file = resolve(process.cwd(), process.env['SEED_USERS_FILE'] ?? DEFAULT_USERS_FILE);
  const users = JSON.parse(readFileSync(file, 'utf8')) as LegacyUser[];

  const merchants = users.filter(
    (u): u is MerchantUser =>
      u.type === 'Merchant' && u.merchant_data?.rin === TENANT_RIN,
  );
  return new Map(merchants.map((m) => [m.username, m]));
}

function toAddress(address: LegacyAddress) {
  return {
    countryCode: address.country,
    countryName: COUNTRY_NAMES[address.country] ?? address.country,
    governorate: address.governate.trim(),
    city: address.regionCity.trim(),
    street: address.street.trim(),
    buildingNumber: address.buildingNumber.trim(),
    postalCode: clean(address.postalCode),
    floor: clean(address.floor),
    apartment: clean(address.room),
    landmark: clean(address.landmark),
    additionalInformation: clean(address.additionalInformation),
  };
}

async function main() {
  const merchants = loadMerchantsByUsername();

  const legacy = (username: string): MerchantUser => {
    const user = merchants.get(username);
    if (!user) {
      throw new Error(`Legacy merchant "${username}" (rin ${TENANT_RIN}) not found in the export.`);
    }
    return user;
  };

  // ---- Tenant ---------------------------------------------------------------
  const tenantCredentials = legacy(TENANT.credentialsFrom).merchant_data;
  const tenantData = {
    nameAr: TENANT.nameAr,
    nameEn: TENANT.nameEn,
    code: TENANT.code,
    activityCode: TENANT.activityCode,
    clientId: tenantCredentials.client_id,
    clientSecret: tenantCredentials.client_secret,
  };

  const tenant = await prisma.tenant.upsert({
    where: { rin: TENANT_RIN },
    update: tenantData,
    create: { ...tenantData, rin: TENANT_RIN, activatedAt: new Date() },
  });

  console.log(`tenant   ${tenant.nameEn} / ${tenant.nameAr} [rin ${tenant.rin}] (${tenant.id})`);

  // ---- Branches -------------------------------------------------------------
  const branchIdByUsername = new Map<string, string>();

  for (const config of BRANCHES) {
    const md = legacy(config.source).merchant_data;
    const branchData = {
      nameAr: config.nameAr,
      nameEn: config.nameEn,
      deviceSerialNumber: config.deviceSerialNumber ?? md.device_serial_number,
      terminalId: md.terminal_id,
      // Explicit nulls so a re-run clears values left by earlier seeds.
      rin: config.ownRin ?? null,
      clientId: config.ownRin ? md.client_id : null,
      clientSecret: config.ownRin ? md.client_secret : null,
    };

    const branch = await prisma.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: config.code } },
      update: branchData,
      create: {
        ...branchData,
        code: config.code,
        activatedAt: toDate(md.createdAt),
        tenant: { connect: { id: tenant.id } },
        // Branch.addressId is a required 1-1, so the address is created inline.
        address: {
          create: {
            ...toAddress(md.branch_address),
            tenant: { connect: { id: tenant.id } },
          },
        },
      },
      select: { id: true },
    });

    for (const username of config.employees) {
      branchIdByUsername.set(username, branch.id);
    }

    const credentials = config.ownRin ? `own rin ${config.ownRin}` : 'tenant credentials';
    console.log(
      `branch   #${config.code} ${config.nameEn} / ${config.nameAr} [device ${branchData.deviceSerialNumber}, ${credentials}] (${branch.id})`,
    );
  }

  // ---- Employees ------------------------------------------------------------
  // Legacy passwords are discarded; every employee gets DEFAULT_PASSWORD.
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  for (const [username, branchId] of branchIdByUsername) {
    const user = legacy(username);
    const name = EMPLOYEE_NAMES[username];
    if (!name) {
      throw new Error(`No name configured for employee "${username}" in EMPLOYEE_NAMES.`);
    }
    const employeeData = {
      ...name,
      type: EmployeeType.MERCHANT,
      passwordHash,
      activatedAt: user.status === 'Active' ? toDate(user.createdAt) : null,
      branch: { connect: { id: branchId } },
    };

    await prisma.employee.upsert({
      where: { tenantId_username: { tenantId: tenant.id, username } },
      update: employeeData,
      create: {
        ...employeeData,
        username,
        tenant: { connect: { id: tenant.id } },
      },
    });

    const code = BRANCHES.find((b) => b.employees.includes(username))!.code;
    console.log(`employee ${username} (${name.nameEn} / ${name.nameAr}) -> branch #${code}`);
  }

  console.log(`\nLogin password for every seeded employee: ${DEFAULT_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
