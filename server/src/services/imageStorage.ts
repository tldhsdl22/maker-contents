import fs from 'node:fs/promises'
import path from 'node:path'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const {
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_PUBLIC_BASE_URL,
} = process.env

const S3_ENABLED = !!(S3_BUCKET && S3_REGION && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)

let s3Client: S3Client | null = null

function getS3Client() {
  if (!S3_ENABLED) {
    throw new Error('S3 환경 변수가 설정되지 않았습니다.')
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID!,
        secretAccessKey: S3_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

export function isS3Enabled() {
  return S3_ENABLED
}

export async function uploadLocalFile(localPath: string, key: string) {
  const client = getS3Client()
  const body = await fs.readFile(localPath)
  const contentType = getContentType(localPath)

  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))

  const base = S3_PUBLIC_BASE_URL
    ? S3_PUBLIC_BASE_URL.replace(/\/$/, '')
    : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`

  return { key, url: `${base}/${key}` }
}

export async function cleanupLocalFile(localPath: string) {
  try {
    await fs.unlink(localPath)
  } catch {
    // ignore
  }
}

export async function deleteStoredFile(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/')
  if (S3_ENABLED && !normalized.includes('uploads/')) {
    const client = getS3Client()
    await client.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET!,
      Key: normalized,
    }))
    return
  }

  try {
    await fs.unlink(path.resolve(filePath))
  } catch {
    // ignore
  }
}
