import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const accountId = process.env.R2_ACCOUNT_ID || 'b2d8a39465363e6ce28ce8a0d9da0288';
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '925d8cdf8398089cdc80b8c657295751';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '33545ba66dcaf6d4c6c9e1888b79fc257d8ef81aca9149e243eba06ae57ee227';

const S3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// ใช้ bucket 'wallcraft' เสมอสำหรับคลังรูปภาพหลัก (ไม่ดึง R2_BUCKET_NAME ซึ่งเป็น hr-immage ของระบบ HR)
const BUCKET_NAME = process.env.R2_WALLCRAFT_BUCKET_NAME || 'wallcraft';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev';

export async function POST(request: NextRequest) {
  try {
    const { fileName, folder = 'original' } = await request.json();
    if (!fileName) return NextResponse.json({ error: 'ไม่พบชื่อไฟล์' }, { status: 400 });

    const key = `${folder}/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'image/webp',
    });

    const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 600 });
    const publicUrl = `${PUBLIC_URL}/${key}`;

    return NextResponse.json({ success: true, presignedUrl, publicUrl });
  } catch (error) {
    console.error('Presign Image Error:', error);
    return NextResponse.json({ error: 'สร้าง URL ไม่สำเร็จ' }, { status: 500 });
  }
}
