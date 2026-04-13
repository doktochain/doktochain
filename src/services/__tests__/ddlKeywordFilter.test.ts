import { describe, it, expect } from 'vitest';

const DANGEROUS_KEYWORDS = ['DROP DATABASE', 'DROP SCHEMA', 'TRUNCATE', 'ALTER SYSTEM'];

function isDangerousSql(sql: string): boolean {
  const upper = sql.toUpperCase();
  return DANGEROUS_KEYWORDS.some((keyword) => upper.includes(keyword));
}

describe('DDL keyword filter (execute-ddl edge function logic)', () => {
  it('blocks DROP DATABASE', () => {
    expect(isDangerousSql('DROP DATABASE production;')).toBe(true);
  });

  it('blocks DROP SCHEMA', () => {
    expect(isDangerousSql('DROP SCHEMA public CASCADE;')).toBe(true);
  });

  it('blocks TRUNCATE', () => {
    expect(isDangerousSql('TRUNCATE TABLE users;')).toBe(true);
  });

  it('blocks ALTER SYSTEM', () => {
    expect(isDangerousSql('ALTER SYSTEM SET work_mem = 1024;')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isDangerousSql('drop database test;')).toBe(true);
    expect(isDangerousSql('Drop Schema public;')).toBe(true);
    expect(isDangerousSql('truncate TABLE users;')).toBe(true);
  });

  it('allows safe DDL statements', () => {
    expect(isDangerousSql('CREATE TABLE IF NOT EXISTS test (id uuid PRIMARY KEY);')).toBe(false);
  });

  it('allows ALTER TABLE', () => {
    expect(isDangerousSql('ALTER TABLE users ADD COLUMN name text;')).toBe(false);
  });

  it('allows CREATE INDEX', () => {
    expect(isDangerousSql('CREATE INDEX idx_users_email ON users (email);')).toBe(false);
  });

  it('allows SELECT statements', () => {
    expect(isDangerousSql('SELECT * FROM users;')).toBe(false);
  });

  it('allows DROP TABLE (only blocks DROP DATABASE and DROP SCHEMA)', () => {
    expect(isDangerousSql('DROP TABLE IF EXISTS temp_table;')).toBe(false);
  });
});
