import { describe, expect, it } from 'vitest';
import { REQUIRED_ENV_VARS, validateEnv } from './check-env.mjs';

describe('check-env (#762)', () => {
  it('flags every required variable when the environment is empty', () => {
    expect(validateEnv({})).toEqual(REQUIRED_ENV_VARS);
  });

  it('treats blank and whitespace-only values as missing', () => {
    const env = Object.fromEntries(REQUIRED_ENV_VARS.map((key) => [key, 'value']));
    env.BRIDGELET_SDK_TOKEN = '   ';
    expect(validateEnv(env)).toEqual(['BRIDGELET_SDK_TOKEN']);
  });

  it('passes when every required variable is set', () => {
    const env = Object.fromEntries(REQUIRED_ENV_VARS.map((key) => [key, 'value']));
    expect(validateEnv(env)).toEqual([]);
  });
});
