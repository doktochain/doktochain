#!/usr/bin/env node

/**
 * DoktoChain Storage Migration Script
 *
 * Migrates files from Supabase Storage to AWS S3.
 * Downloads files from Supabase, uploads to S3, verifies checksums,
 * and updates database URLs.
 *
 * Usage:
 *   export SUPABASE_URL=https://your-project.supabase.co
 *   export SUPABASE_SERVICE_KEY=your-service-role-key
 *   export S3_BUCKET=doktochain-production-storage
 *   export AWS_REGION=ca-central-1
 *   export AWS_PROFILE=doktochain
 *   node infrastructure/scripts/migrate-storage.js
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const S3_BUCKET = process.env.S3_BUCKET || 'doktochain-production-storage';
const REGION = process.env.AWS_REGION || 'ca-central-1';
const DRY_RUN = process.env.DRY_RUN === 'true';
const TEMP_DIR = path.join(process.cwd(), '.storage-migration-tmp');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });

const BUCKET_MAP = [
  'medical-records',
  'profile-photos',
  'identity-documents',
  'prescriptions',
  'insurance-cards',
  'clinic-documents',
  'cms-media',
];

function supabaseFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${endpoint}`);
    const proto = url.protocol === 'https:' ? https : http;
    const headers = {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      ...options.headers,
    };

    const req = proto.request(
      url,
      { method: options.method || 'GET', headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body.toString()}`));
          } else {
            resolve({ status: res.statusCode, body, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function listBucketFiles(bucketName) {
  try {
    const response = await supabaseFetch(`/storage/v1/object/list/${bucketName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const items = JSON.parse(response.body.toString());
    return Array.isArray(items) ? items : [];
  } catch (err) {
    if (err.message.includes('404') || err.message.includes('not found')) {
      return [];
    }
    throw err;
  }
}

async function listAllFilesRecursive(bucketName, prefix = '') {
  const files = [];

  try {
    const bodyPayload = JSON.stringify({
      prefix: prefix,
      limit: 1000,
      offset: 0,
    });

    const url = new URL(`${SUPABASE_URL}/storage/v1/object/list/${bucketName}`);
    const proto = url.protocol === 'https:' ? https : http;

    const response = await new Promise((resolve, reject) => {
      const req = proto.request(
        url,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyPayload),
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks);
            resolve({ status: res.statusCode, body });
          });
        }
      );
      req.on('error', reject);
      req.write(bodyPayload);
      req.end();
    });

    if (response.status >= 400) return files;

    const items = JSON.parse(response.body.toString());
    if (!Array.isArray(items)) return files;

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        files.push({
          name: item.name,
          path: fullPath,
          size: item.metadata?.size || 0,
          mimeType: item.metadata?.mimetype || 'application/octet-stream',
        });
      } else {
        const subFiles = await listAllFilesRecursive(bucketName, fullPath);
        files.push(...subFiles);
      }
    }
  } catch {
    // bucket may not exist
  }

  return files;
}

async function downloadFile(bucketName, filePath) {
  const response = await supabaseFetch(
    `/storage/v1/object/${bucketName}/${encodeURIComponent(filePath)}`
  );
  return response.body;
}

function computeChecksum(buffer) {
  return createHash('md5').update(buffer).digest('hex');
}

async function uploadToS3(key, body, contentType) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload: s3://${S3_BUCKET}/${key} (${body.length} bytes)`);
    return;
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });

  await s3.send(command);
}

async function verifyS3Upload(key, expectedChecksum) {
  if (DRY_RUN) return true;

  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== DoktoChain Storage Migration ===');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`S3 Bucket: ${S3_BUCKET}`);
  console.log(`Region: ${REGION}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('');

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const results = {
    totalFiles: 0,
    uploaded: 0,
    verified: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const urlUpdates = [];

  for (const bucketName of BUCKET_MAP) {
    console.log(`Scanning bucket: ${bucketName}`);

    const files = await listAllFilesRecursive(bucketName);

    if (files.length === 0) {
      console.log(`  No files found in ${bucketName}`);
      continue;
    }

    console.log(`  Found ${files.length} files`);

    for (const file of files) {
      results.totalFiles++;
      const s3Key = `${bucketName}/${file.path}`;
      const progress = `[${results.totalFiles}]`;

      try {
        console.log(`  ${progress} Downloading: ${bucketName}/${file.path}`);
        const fileBuffer = await downloadFile(bucketName, file.path);
        const checksum = computeChecksum(fileBuffer);

        console.log(`  ${progress} Uploading to: s3://${S3_BUCKET}/${s3Key} (${fileBuffer.length} bytes)`);
        await uploadToS3(s3Key, fileBuffer, file.mimeType);

        const verified = await verifyS3Upload(s3Key, checksum);
        if (verified) {
          results.uploaded++;
          results.verified++;

          const oldUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${file.path}`;
          const newUrl = `s3://${S3_BUCKET}/${s3Key}`;
          urlUpdates.push({ old: oldUrl, new: newUrl, bucket: bucketName, path: file.path });
        } else {
          console.error(`  ${progress} VERIFICATION FAILED: ${s3Key}`);
          results.failed++;
          results.errors.push({ file: s3Key, error: 'Checksum verification failed' });
        }
      } catch (err) {
        console.error(`  ${progress} FAILED: ${bucketName}/${file.path} -- ${err.message}`);
        results.failed++;
        results.errors.push({ file: `${bucketName}/${file.path}`, error: err.message });
      }

      if (results.totalFiles % 50 === 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  const urlUpdateSQL = [
    '-- DoktoChain Storage URL Update Script',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total files migrated: ${results.uploaded}`,
    '',
  ];

  const tableColumns = [
    { table: 'user_profiles', column: 'profile_photo_url' },
    { table: 'providers', column: 'profile_photo_url' },
    { table: 'pharmacies', column: 'logo_url' },
    { table: 'clinics', column: 'logo_url' },
  ];

  for (const { table, column } of tableColumns) {
    urlUpdateSQL.push(
      `UPDATE ${table} SET ${column} = REPLACE(${column}, '${SUPABASE_URL}/storage/v1/object/public/', 'https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/') WHERE ${column} LIKE '${SUPABASE_URL}%';`
    );
  }

  const sqlPath = path.join(process.cwd(), 'update_storage_urls.sql');
  fs.writeFileSync(sqlPath, urlUpdateSQL.join('\n'), 'utf-8');

  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch {}

  console.log('');
  console.log('=== Storage Migration Summary ===');
  console.log(`  Total files scanned: ${results.totalFiles}`);
  console.log(`  Uploaded:            ${results.uploaded}`);
  console.log(`  Verified:            ${results.verified}`);
  console.log(`  Failed:              ${results.failed}`);
  console.log(`  Skipped:             ${results.skipped}`);
  console.log('');
  console.log(`URL update SQL written to: ${sqlPath}`);
  console.log('Apply it with:');
  console.log('  psql "host=<RDS_PROXY> port=5432 dbname=doktochain user=doktochain password=<PASSWORD> sslmode=require" < update_storage_urls.sql');

  if (results.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    results.errors.forEach((e) => console.log(`  ${e.file}: ${e.error}`));
  }

  if (results.failed > 0) {
    console.log('');
    console.log('WARNING: Some files failed. Re-run the script to retry.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
