import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Storage configuration interface
 */
interface StorageConfig {
  enabled: boolean
  type: 'minio' | 'local'
  bucket?: string
  endpoint?: string
}

/**
 * Get storage configuration from runtime config
 */
export function getStorageConfig(): StorageConfig {
  const config = useRuntimeConfig()

  const minioAccessKey = config.minioAccessKey
  const minioSecretKey = config.minioSecretKey
  const minioBucketName = config.minioBucketName || 'arpix-bucket'

  // Check if MinIO is configured
  const minioConfigured = !!(minioAccessKey && minioSecretKey)

  return {
    enabled: minioConfigured,
    type: minioConfigured ? 'minio' : 'local',
    bucket: minioBucketName,
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000'
  }
}

/**
 * Create S3 client for MinIO
 */
export function createS3Client(): S3Client | null {
  const config = useRuntimeConfig()

  const accessKey = config.minioAccessKey
  const secretKey = config.minioSecretKey

  if (!accessKey || !secretKey) {
    return null
  }

  const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000'

  return new S3Client({
    region: 'us-east-1',
    endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    },
    forcePathStyle: true // Required for MinIO
  })
}

/**
 * Check if MinIO bucket exists and is accessible
 */
export async function isMinIOAvailable(): Promise<boolean> {
  const client = createS3Client()
  const config = getStorageConfig()

  if (!client || !config.bucket) {
    return false
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
    return true
  } catch {
    return false
  }
}

/**
 * Local storage directory for avatars
 */
const LOCAL_AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars')

/**
 * Ensure local avatar directory exists
 */
async function ensureLocalDir(): Promise<void> {
  if (!existsSync(LOCAL_AVATAR_DIR)) {
    await mkdir(LOCAL_AVATAR_DIR, { recursive: true })
  }
}

/**
 * Upload file to storage (MinIO or local)
 * @param filename - Unique filename
 * @param buffer - File buffer
 * @param contentType - MIME type
 * @returns URL path to the file
 */
export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string, storage: 'minio' | 'local' }> {
  const minioAvailable = await isMinIOAvailable()

  if (minioAvailable) {
    return uploadToMinio(filename, buffer, contentType)
  }

  return uploadToLocal(filename, buffer)
}

/**
 * Upload to MinIO
 */
async function uploadToMinio(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string, storage: 'minio' }> {
  const client = createS3Client()
  const config = getStorageConfig()

  if (!client || !config.bucket) {
    throw new Error('MinIO not configured')
  }

  const key = `avatars/${filename}`

  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000' // 1 year
  }))

  // Return API URL that serves the file
  return {
    url: `/api/avatar/file/${filename}`,
    storage: 'minio'
  }
}

/**
 * Upload to local filesystem
 */
async function uploadToLocal(
  filename: string,
  buffer: Buffer
): Promise<{ url: string, storage: 'local' }> {
  await ensureLocalDir()

  const filePath = path.join(LOCAL_AVATAR_DIR, filename)
  await writeFile(filePath, buffer)

  return {
    url: `/api/avatar/file/${filename}`,
    storage: 'local'
  }
}

/**
 * Get file from storage
 * @param filename - Filename to retrieve
 * @returns Buffer and content type, or null if not found
 */
export async function getFile(filename: string): Promise<{ buffer: Buffer, contentType: string } | null> {
  // Try MinIO first
  const minioAvailable = await isMinIOAvailable()

  if (minioAvailable) {
    const result = await getFromMinio(filename)
    if (result) return result
  }

  // Fallback to local
  return getFromLocal(filename)
}

/**
 * Get file from MinIO
 */
async function getFromMinio(filename: string): Promise<{ buffer: Buffer, contentType: string } | null> {
  const client = createS3Client()
  const config = getStorageConfig()

  if (!client || !config.bucket) {
    return null
  }

  try {
    const key = `avatars/${filename}`
    const response = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key
    }))

    if (!response.Body) {
      return null
    }

    const buffer = Buffer.from(await response.Body.transformToByteArray())
    const contentType = response.ContentType || 'application/octet-stream'

    return { buffer, contentType }
  } catch {
    return null
  }
}

/**
 * Get file from local filesystem
 */
async function getFromLocal(filename: string): Promise<{ buffer: Buffer, contentType: string } | null> {
  const filePath = path.join(LOCAL_AVATAR_DIR, filename)

  if (!existsSync(filePath)) {
    return null
  }

  const buffer = await readFile(filePath)

  // Determine content type from extension
  const ext = path.extname(filename).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  }

  const contentType = contentTypes[ext] || 'application/octet-stream'

  return { buffer, contentType }
}

/**
 * Delete file from storage
 * @param filename - Filename to delete
 */
export async function deleteFile(filename: string): Promise<boolean> {
  const minioAvailable = await isMinIOAvailable()

  if (minioAvailable) {
    return deleteFromMinio(filename)
  }

  // Delete from local
  const filePath = path.join(LOCAL_AVATAR_DIR, filename)
  if (existsSync(filePath)) {
    await unlink(filePath)
    return true
  }

  return false
}

/**
 * Delete file from MinIO
 */
async function deleteFromMinio(filename: string): Promise<boolean> {
  const client = createS3Client()
  const config = getStorageConfig()

  if (!client || !config.bucket) {
    return false
  }

  try {
    const key = `avatars/${filename}`
    await client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key
    }))
    return true
  } catch {
    return false
  }
}

/**
 * Extract filename from avatar URL
 * @param url - Full avatar URL or API path
 */
export function extractFilenameFromUrl(url: string): string | null {
  // Handle both full URLs and API paths
  // e.g., "http://localhost:3000/api/avatar/file/abc-123.webp" -> "abc-123.webp"
  // e.g., "/api/avatar/file/abc-123.webp" -> "abc-123.webp"
  const match = url.match(/\/api\/avatar\/file\/([^/?]+)/)
  return match?.[1] ?? null
}

/**
 * Generate unique filename for avatar
 * @param userId - User ID
 * @param format - Image format (webp, avif)
 */
export function generateAvatarFilename(userId: string, format: string = 'webp'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${userId}-${timestamp}-${random}.${format}`
}
