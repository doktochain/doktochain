import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import {
  success, created, noContent, badRequest,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const s3Client = new S3Client({});
const BUCKET = process.env.STORAGE_BUCKET!;

const ALLOWED_PREFIXES = [
  'medical-records', 'profile-photos', 'identity-documents',
  'prescriptions', 'insurance-cards', 'clinic-documents', 'cms-media',
];

const MAX_FILE_SIZE: Record<string, number> = {
  'medical-records': 25 * 1024 * 1024,
  'profile-photos': 5 * 1024 * 1024,
  'identity-documents': 10 * 1024 * 1024,
  'prescriptions': 10 * 1024 * 1024,
  'insurance-cards': 10 * 1024 * 1024,
  'clinic-documents': 25 * 1024 * 1024,
  'cms-media': 50 * 1024 * 1024,
};

const router = new Router('/storage');

router.post('/presign-upload', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    prefix: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }>(event.body);

  if (!ALLOWED_PREFIXES.includes(body.prefix)) {
    return badRequest(`Invalid storage prefix: ${body.prefix}`, origin);
  }

  const maxSize = MAX_FILE_SIZE[body.prefix] || 10 * 1024 * 1024;
  if (body.fileSize > maxSize) {
    return badRequest(`File size exceeds maximum of ${maxSize / 1024 / 1024}MB`, origin);
  }

  const ext = body.fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const key = `storage/${body.prefix}/${user.userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: body.contentType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'uploaded-by': user.userId,
      'original-name': body.fileName,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  const publicUrl = `https://d1pcyuvbqz55za.cloudfront.net/${key}`;
return created({ uploadUrl, key, publicUrl, expiresIn: 300 }, origin);
});

router.post('/presign-download', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{ key: string }>(event.body);

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: body.key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return success({ downloadUrl, expiresIn: 3600 }, origin);
});

router.post('/delete', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{ key: string }>(event.body);

  if (!body.key) {
    return badRequest('Key is required', origin);
  }

  const keyParts = body.key.split('/');
  const ownerSegment = keyParts.length >= 3 ? keyParts[2] : (keyParts.length >= 2 ? keyParts[1] : '');
  if (ownerSegment !== user.userId && user.role !== 'admin') {
    return badRequest('You can only delete your own files', origin);
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: body.key,
  });

  await s3Client.send(command);

  return noContent(origin);
});

router.get('/list', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const prefix = getQueryParam(event.queryStringParameters, 'prefix') || '';
  const folder = `storage/${prefix}/${user.userId}/`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: folder,
    MaxKeys: 100,
  });

  const result = await s3Client.send(command);

  const files = (result.Contents || []).map(obj => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
  }));

  return success(files, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
