type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_CRYPTO_NETWORK: string;
  NEXT_PUBLIC_SUPPORT_EMAIL: string;
};

function readPublicEnv(name: keyof PublicEnv): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return 'not-configured';
  }
  return value;
}

export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: readPublicEnv('NEXT_PUBLIC_APP_URL'),
  NEXT_PUBLIC_API_BASE_URL: readPublicEnv('NEXT_PUBLIC_API_BASE_URL'),
  NEXT_PUBLIC_CRYPTO_NETWORK: readPublicEnv('NEXT_PUBLIC_CRYPTO_NETWORK'),
  NEXT_PUBLIC_SUPPORT_EMAIL: readPublicEnv('NEXT_PUBLIC_SUPPORT_EMAIL'),
};
