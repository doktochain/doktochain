#!/usr/bin/env node

/**
 * DoktoChain User Migration Script
 *
 * Migrates users from Supabase Auth to AWS Cognito.
 * Reads users_export.csv (exported from Supabase) and creates them in Cognito.
 *
 * Usage:
 *   export COGNITO_USER_POOL_ID=ca-central-1_xxxxx
 *   export AWS_REGION=ca-central-1
 *   export AWS_PROFILE=doktochain
 *   node infrastructure/scripts/migrate-users.js
 *
 * Input:  users_export.csv (in project root)
 * Output: sync_auth_users.sql (in project root)
 */

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminSetUserPasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION = process.env.AWS_REGION || 'ca-central-1';
const CSV_PATH = process.env.CSV_PATH || path.join(process.cwd(), 'users_export.csv');
const SQL_OUTPUT_PATH = path.join(process.cwd(), 'sync_auth_users.sql');
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!USER_POOL_ID) {
  console.error('ERROR: COGNITO_USER_POOL_ID environment variable is required');
  process.exit(1);
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`ERROR: CSV file not found at ${CSV_PATH}`);
  console.error('');
  console.error('Export users from Supabase first:');
  console.error('  psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres \\');
  console.error('    -c "COPY (SELECT au.id, au.email, au.raw_user_meta_data, up.role,');
  console.error('      up.first_name, up.last_name, up.phone');
  console.error('    FROM auth.users au');
  console.error('    LEFT JOIN public.user_profiles up ON up.user_id = au.id');
  console.error('    WHERE au.deleted_at IS NULL) TO STDOUT WITH CSV HEADER" > users_export.csv');
  process.exit(1);
}

const client = new CognitoIdentityProviderClient({ region: REGION });

function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    console.error('ERROR: CSV file is empty or has only headers');
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function generateTempPassword() {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '!@#$%&*';

  let password = '';
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += digits[crypto.randomInt(digits.length)];
  password += special[crypto.randomInt(special.length)];

  const all = lower + upper + digits + special;
  for (let i = 0; i < 8; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

function mapRole(role) {
  const validRoles = ['patient', 'provider', 'pharmacy', 'admin', 'clinic'];
  const normalizedRole = (role || 'patient').toLowerCase().trim();
  return validRoles.includes(normalizedRole) ? normalizedRole : 'patient';
}

async function createCognitoUser(user) {
  const role = mapRole(user.role);
  const tempPassword = generateTempPassword();

  const userAttributes = [
    { Name: 'email', Value: user.email },
    { Name: 'email_verified', Value: 'true' },
    { Name: 'custom:role', Value: role },
  ];

  if (user.first_name) {
    userAttributes.push({ Name: 'given_name', Value: user.first_name });
  }
  if (user.last_name) {
    userAttributes.push({ Name: 'family_name', Value: user.last_name });
  }
  if (user.phone) {
    userAttributes.push({ Name: 'phone_number', Value: user.phone });
  }

  const createCommand = new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: user.email,
    TemporaryPassword: tempPassword,
    UserAttributes: userAttributes,
    DesiredDeliveryMediums: ['EMAIL'],
    MessageAction: 'SUPPRESS',
  });

  const result = await client.send(createCommand);
  const cognitoSub = result.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;

  const addToGroupCommand = new AdminAddUserToGroupCommand({
    UserPoolId: USER_POOL_ID,
    Username: user.email,
    GroupName: role,
  });
  await client.send(addToGroupCommand);

  return { cognitoSub, tempPassword };
}

async function main() {
  console.log('=== DoktoChain User Migration ===');
  console.log(`User Pool ID: ${USER_POOL_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`CSV: ${CSV_PATH}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('');

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const users = parseCSV(csvContent);
  console.log(`Found ${users.length} users to migrate`);
  console.log('');

  const results = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const sqlStatements = [
    '-- DoktoChain auth.users sync file',
    '-- Generated by migrate-users.js',
    `-- Date: ${new Date().toISOString()}`,
    '',
    'CREATE TABLE IF NOT EXISTS auth.users (',
    '  id uuid PRIMARY KEY,',
    '  email text UNIQUE NOT NULL,',
    '  cognito_sub text,',
    '  role text,',
    '  created_at timestamptz DEFAULT now()',
    ');',
    '',
  ];

  const userMappings = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `[${i + 1}/${users.length}]`;

    if (!user.email) {
      console.log(`${progress} Skipping: no email`);
      results.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`${progress} [DRY RUN] Would create: ${user.email} (${mapRole(user.role)})`);
      results.created++;
      userMappings.push({
        supabaseId: user.id,
        email: user.email,
        cognitoSub: `dry-run-${user.id}`,
        role: mapRole(user.role),
      });
      continue;
    }

    try {
      const { cognitoSub, tempPassword } = await createCognitoUser(user);
      console.log(`${progress} Created: ${user.email} (${mapRole(user.role)}) -> ${cognitoSub}`);
      results.created++;

      userMappings.push({
        supabaseId: user.id,
        email: user.email,
        cognitoSub,
        role: mapRole(user.role),
      });
    } catch (err) {
      if (err.name === 'UsernameExistsException') {
        console.log(`${progress} Skipped (already exists): ${user.email}`);
        results.skipped++;
        userMappings.push({
          supabaseId: user.id,
          email: user.email,
          cognitoSub: 'existing',
          role: mapRole(user.role),
        });
      } else {
        console.error(`${progress} FAILED: ${user.email} -- ${err.message}`);
        results.failed++;
        results.errors.push({ email: user.email, error: err.message });
      }
    }

    if (i % 10 === 0 && i > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  for (const mapping of userMappings) {
    const escapedEmail = mapping.email.replace(/'/g, "''");
    sqlStatements.push(
      `INSERT INTO auth.users (id, email, cognito_sub, role) VALUES ('${mapping.supabaseId}', '${escapedEmail}', '${mapping.cognitoSub}', '${mapping.role}') ON CONFLICT (id) DO UPDATE SET cognito_sub = EXCLUDED.cognito_sub, role = EXCLUDED.role;`
    );
  }

  sqlStatements.push('');
  sqlStatements.push(`-- Total users synced: ${userMappings.length}`);

  fs.writeFileSync(SQL_OUTPUT_PATH, sqlStatements.join('\n'), 'utf-8');

  console.log('');
  console.log('=== Migration Summary ===');
  console.log(`  Created:  ${results.created}`);
  console.log(`  Skipped:  ${results.skipped}`);
  console.log(`  Failed:   ${results.failed}`);
  console.log('');
  console.log(`SQL sync file written to: ${SQL_OUTPUT_PATH}`);
  console.log('Apply it with:');
  console.log(`  psql "host=<RDS_PROXY> port=5432 dbname=doktochain user=doktochain password=<PASSWORD> sslmode=require" < ${SQL_OUTPUT_PATH}`);

  if (results.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    results.errors.forEach((e) => console.log(`  ${e.email}: ${e.error}`));
  }

  if (results.failed > 0) {
    console.log('');
    console.log('WARNING: Some users failed to migrate. Re-run the script to retry (existing users will be skipped).');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
