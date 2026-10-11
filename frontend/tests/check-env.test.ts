import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

describe('check-env script', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/check-env.mjs');

  it('passes when environment is valid', () => {
    const output = execSync(
ode "", {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001',
      },
      encoding: 'utf-8',
    });
    expect(output).toContain('Environment configuration validated successfully');
  });

  it('fails in production when BRIDGELET_SDK_URL or BRIDGELET_SDK_TOKEN is missing', () => {
    expect(() => {
      execSync(
ode "", {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          E2E_USE_MOCKS: 'false',
          BRIDGELET_SDK_URL: '',
          BRIDGELET_SDK_TOKEN: '',
        },
        encoding: 'utf-8',
      });
    }).toThrow();
  });

  it('fails when sensitive token has NEXT_PUBLIC_ prefix', () => {
    expect(() => {
      execSync(
ode "", {
        env: {
          ...process.env,
          NEXT_PUBLIC_BRIDGELET_SECRET: 'leaked_secret',
        },
        encoding: 'utf-8',
      });
    }).toThrow();
  });
});