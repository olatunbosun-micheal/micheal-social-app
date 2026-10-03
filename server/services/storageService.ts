import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure local directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 1. Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'gateway-media';

let supabaseClient: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 2. Cloudflare R2 / S3 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3Client: S3Client | null = null;
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export interface UploadResult {
  url: string;
  key: string;
  storage: 'supabase' | 'r2' | 'local';
}

export class StorageService {
  /**
   * Uploads a file (voice note, image, attachment) to Supabase Storage if configured,
   * otherwise Cloudflare R2 / S3, or falls back to local disk storage.
   */
  static async uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }): Promise<UploadResult> {
    const uniqueKey = `${Date.now()}_${params.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // 1. Supabase Storage (Preferred if configured)
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.storage
          .from(SUPABASE_BUCKET)
          .upload(uniqueKey, params.buffer, {
            contentType: params.mimeType,
            upsert: true,
          });

        if (!error) {
          const { data } = supabaseClient.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(uniqueKey);

          return {
            url: data.publicUrl,
            key: uniqueKey,
            storage: 'supabase',
          };
        } else {
          console.warn('[StorageService] Supabase upload error:', error.message);
        }
      } catch (err) {
        console.error('[StorageService] Supabase upload exception:', err);
      }
    }

    // 2. Cloudflare R2 / S3 Storage
    if (s3Client && R2_BUCKET_NAME) {
      try {
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: uniqueKey,
          Body: params.buffer,
          ContentType: params.mimeType,
        });

        await s3Client.send(command);

        if (R2_PUBLIC_URL) {
          const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
          return {
            url: `${baseUrl}/${uniqueKey}`,
            key: uniqueKey,
            storage: 'r2',
          };
        }

        return {
          url: `/api/media/stream/${uniqueKey}`,
          key: uniqueKey,
          storage: 'r2',
        };
      } catch (err) {
        console.error('[StorageService] R2 Upload failed:', err);
      }
    }

    // 3. Local Disk Fallback
    const localFilePath = path.join(UPLOADS_DIR, uniqueKey);
    fs.writeFileSync(localFilePath, params.buffer);

    return {
      url: `/api/media/stream/${uniqueKey}`,
      key: uniqueKey,
      storage: 'local',
    };
  }

  static getLocalPath(filename: string): string {
    return path.join(UPLOADS_DIR, filename);
  }

  static getActiveProvider(): 'supabase' | 'r2' | 'local' {
    if (supabaseClient) return 'supabase';
    if (s3Client) return 'r2';
    return 'local';
  }
}
