import { z } from 'zod';

const required = (value?: string) =>
  value
    ? z.string({ error: 'is required' }).min(1, 'is required').default(value)
    : z.string({ error: 'is required' }).min(1, 'is required');

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(['development', 'testing', 'staging', 'production'])
    .default('development'),
  DATABASE_URL: z.url(),
  BRANCH_JWT_SECRET: required(),
  API_VERSION: required('v1'),
  TOKEN_EXPIRY_PERIOD: required(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const envValidate = (config: Record<string, unknown>): AppEnv => {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Config validation error:\n${problems}`);
  }
  return result.data;
};
