// #106 – Client-side claim token format validation
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type TokenValidationResult = { valid: true } | { valid: false; reason: string };

export function validateClaimToken(token: unknown): TokenValidationResult {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return { valid: false, reason: 'No claim token found in this link.' };
  }
  if (!TOKEN_PATTERN.test(token)) {
    return { valid: false, reason: 'This claim link appears to be invalid or corrupted.' };
  }
  return { valid: true };
}
