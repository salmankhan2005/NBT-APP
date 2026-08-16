import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || '';

export const isPlaceholderUrl =
  !connectionString ||
  connectionString.includes('ep-xxxx') ||
  connectionString.includes('user:password');

if (isPlaceholderUrl) {
  console.warn(
    '\n⚠️  [DATABASE] DATABASE_URL in backend/.env is using placeholder credentials.\n' +
    '   Please update DATABASE_URL with your Neon Postgres connection string from https://console.neon.tech\n'
  );
}

// Neon serverless driver — uses HTTP fetch under the hood
export const sql = neon(connectionString || 'postgresql://placeholder:placeholder@ep-placeholder.neon.tech/neondb');

// Health-check helper
export async function pingDatabase(): Promise<void> {
  if (isPlaceholderUrl) {
    throw new Error('DATABASE_URL is unconfigured (using placeholder in .env).');
  }
  await sql`SELECT 1`;
}
