// Rate limiting / brute-force lockout helper for claim token verification
const attempts: Record<string, { count: number; lockedUntil: number }> = {};

export function verifyClaimTokenWithLockout(ip: string, token: string): boolean {
  const now = Date.now();
  if (attempts[ip] && attempts[ip].lockedUntil > now) {
    throw new Error('Too many failed attempts. Try again later.');
  }
  
  if (token !== 'valid-token') {
    attempts[ip] = attempts[ip] || { count: 0, lockedUntil: 0 };
    attempts[ip].count += 1;
    if (attempts[ip].count >= 5) {
      attempts[ip].lockedUntil = now + 15 * 60 * 1000; // 15 mins lock
    }
    return false;
  }
  return true;
}
