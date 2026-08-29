import { describe, it, expect } from 'vitest';
import {
  isValidStellarAddress,
  STELLAR_ADDRESS_PATTERN,
  STELLAR_ADDRESS_ERROR,
} from './stellar-address';

describe('isValidStellarAddress (Issue #420)', () => {
  it('accepts a well-formed 56-character Stellar public key starting with G', () => {
    expect(isValidStellarAddress('G' + 'A'.repeat(55))).toBe(true);
    expect(isValidStellarAddress('G' + 'Z'.repeat(55))).toBe(true);
    expect(isValidStellarAddress('G' + '2'.repeat(55))).toBe(true);
    expect(isValidStellarAddress('G' + '7'.repeat(55))).toBe(true);
  });

  it('rejects an address not starting with G', () => {
    expect(isValidStellarAddress('S' + 'A'.repeat(55))).toBe(false);
  });

  it('rejects addresses of the wrong length', () => {
    expect(isValidStellarAddress('G' + 'A'.repeat(54))).toBe(false); // too short
    expect(isValidStellarAddress('G' + 'A'.repeat(56))).toBe(false); // too long
    expect(isValidStellarAddress('')).toBe(false);
  });

  it('rejects characters outside the base32 alphabet (0, 1, 8, 9 are not valid)', () => {
    expect(isValidStellarAddress('G' + '0'.repeat(55))).toBe(false);
    expect(isValidStellarAddress('G' + '1'.repeat(55))).toBe(false);
    expect(isValidStellarAddress('G' + '8'.repeat(55))).toBe(false);
    expect(isValidStellarAddress('G' + '9'.repeat(55))).toBe(false);
  });

  it('rejects lowercase addresses', () => {
    expect(isValidStellarAddress('g' + 'a'.repeat(55))).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidStellarAddress(`  ${'G' + 'A'.repeat(55)}  `)).toBe(true);
  });

  it('exposes a matching regex and a human-readable error message', () => {
    expect(STELLAR_ADDRESS_PATTERN.test('G' + 'A'.repeat(55))).toBe(true);
    expect(STELLAR_ADDRESS_ERROR).toMatch(/starts with g/i);
  });
});
