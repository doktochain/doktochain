import { Pool, PoolClient } from 'pg';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

let pool: Pool | null = null;
let cachedCredentials: { username: string; password: string; host: string; port: number } | null = null;

const secretsClient = new SecretsManagerClient({});

async function getCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const secretArn = process.env.DB_SECRET_ARN!;
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await secretsClient.send(command);
  const secret = JSON.parse(response.SecretString!);

  cachedCredentials = {
    username: secret.username,
    password: secret.password,
    host: process.env.DB_HOST || secret.host,
    port: secret.port || 5432,
  };

  return cachedCredentials;
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const creds = await getCredentials();

  pool = new Pool({
    host: creds.host,
    port: creds.port,
    user: creds.username,
    password: creds.password,
    database: process.env.DB_NAME || 'doktochain',
    ssl: { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  });

  return pool;
}

export async function withRLS<T>(
  userId: string,
  role: string,
  jwtClaims: Record<string, unknown>,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = await getPool();
  const client = await p.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
    await client.query(`SELECT set_config('app.current_role', $1, true)`, [role]);
    await client.query(`SELECT set_config('app.jwt_claims', $1, true)`, [JSON.stringify(jwtClaims)]);

    const result = await fn(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: unknown[]) {
  const p = await getPool();
  return p.query(text, params);
}

export async function withServiceRole<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = await getPool();
  const client = await p.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', '00000000-0000-0000-0000-000000000000', true)`);
    await client.query(`SELECT set_config('app.current_role', 'service_role', true)`);

    const result = await fn(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
