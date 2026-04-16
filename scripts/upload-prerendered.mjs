#!/usr/bin/env node
/**
 * Uploads every file listed in dist/__prerendered/manifest.json to S3 at its
 * exact URL-path key (no .html extension) and invalidates CloudFront paths.
 *
 * Env:
 *   S3_BUCKET (required)
 *   CLOUDFRONT_DISTRIBUTION_ID (optional; invalidation is skipped if missing)
 *   AWS_REGION (optional; defaults to ca-central-1)
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STAGING = resolve(ROOT, 'dist', '__prerendered');
const MANIFEST = resolve(STAGING, 'manifest.json');

const BUCKET = process.env.S3_BUCKET;
const DIST_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
const REGION = process.env.AWS_REGION || 'ca-central-1';

if (!BUCKET) {
  console.error('S3_BUCKET env var is required');
  process.exit(1);
}

function run(bin, args) {
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`${bin} ${args.join(' ')} exited ${r.status}`);
  }
}

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  console.log(`[upload] ${manifest.length} prerendered pages → s3://${BUCKET}/`);

  const invalidationPaths = new Set();

  for (const entry of manifest) {
    const localPath = resolve(STAGING, entry.file);
    const key = entry.s3Key;
    run('aws', [
      's3',
      'cp',
      localPath,
      `s3://${BUCKET}/${key}`,
      '--content-type',
      'text/html; charset=utf-8',
      '--cache-control',
      'public, max-age=300, s-maxage=3600',
      '--region',
      REGION,
    ]);
    invalidationPaths.add(`/${key}`);
  }

  if (DIST_ID) {
    const paths = Array.from(invalidationPaths);
    console.log(`[upload] invalidating ${paths.length} CloudFront paths`);
    while (paths.length > 0) {
      const chunk = paths.splice(0, 30);
      run('aws', [
        'cloudfront',
        'create-invalidation',
        '--distribution-id',
        DIST_ID,
        '--paths',
        ...chunk,
        '--region',
        REGION,
        '--no-cli-pager',
      ]);
    }
  } else {
    console.log('[upload] CLOUDFRONT_DISTRIBUTION_ID not set — skipping invalidation');
  }
}

main();
