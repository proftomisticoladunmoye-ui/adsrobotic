import { describe, it, expect, beforeEach } from 'vitest';
import { loadServerEnv, resetServerEnvCache } from './env';

const base = {
  SESSION_SECRET: 'x'.repeat(32),
  TOKEN_ENCRYPTION_KEY: 'y'.repeat(32),
  DATABASE_URL: 'postgresql://u:p@localhost:5432/adsrobotic',
};

describe('loadServerEnv', () => {
  beforeEach(() => resetServerEnvCache());

  it('parses a minimal valid environment with sensible defaults', () => {
    const env = loadServerEnv({ ...base } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.AI_PROVIDER).toBe('local');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('rejects a short SESSION_SECRET', () => {
    resetServerEnvCache();
    expect(() =>
      loadServerEnv({ ...base, SESSION_SECRET: 'too-short' } as NodeJS.ProcessEnv),
    ).toThrow(/SESSION_SECRET/);
  });

  it('requires DATABASE_URL', () => {
    resetServerEnvCache();
    const { DATABASE_URL: _omit, ...withoutDb } = base;
    expect(() => loadServerEnv(withoutDb as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });
});
