import { GetObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET || 'iljar-photos';

function assertS3Config() {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 configuration error: S3_ACCESS_KEY_ID og/eða S3_SECRET_ACCESS_KEY vantar.');
  }

  if (
    accessKeyId.includes('your-access-key')
    || secretAccessKey.includes('your-secret-key')
  ) {
    throw new Error('S3 configuration error: placeholder lyklar eru í notkun. Settu raunverulega S3 lykla í .env.');
  }
}

/**
 * Generate a pre-signed URL for uploading a photo
 * @param key - The S3 object key (file path)
 * @param contentType - The MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
 */
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  assertS3Config();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Generate a pre-signed URL for downloading/viewing a photo
 * @param key - The S3 object key (file path)
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  assertS3Config();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Generate a unique file key for storing photos
 * @param visitId - The visit ID
 * @param filename - Original filename
 */
export function generatePhotoKey(visitId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `visits/${visitId}/${timestamp}-${sanitizedFilename}`;
}
