import process from 'node:process';

const requiredEnv = ['BRIDGELET_SDK_URL', 'BRIDGELET_SDK_TOKEN'];
const missing = requiredEnv.filter((env) => !process.env[env]);

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('\n❌ [Build Failure]: Missing required server-side variables!');
  console.error(`Missing keys: ${missing.join(', ')}`);
  console.error('Please configure these missing variables before executing a production build.\n');
  process.exit(1);
}

console.log('✅ Environment verification check passed.');
process.exit(0);
