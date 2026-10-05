// src/app/api/r2/compress-all/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, _Object } from "@aws-sdk/client-s3";
import sharp from "sharp";

const accountId = process.env.R2_ACCOUNT_ID || 'b2d8a39465363e6ce28ce8a0d9da0288';
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '925d8cdf8398089cdc80b8c657295751';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '33545ba66dcaf6d4c6c9e1888b79fc257d8ef81aca9149e243eba06ae57ee227';

const s3Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// ใช้ bucket 'wallcraft' เสมอสำหรับคลังรูปภาพหลัก (ไม่ดึง R2_BUCKET_NAME ซึ่งเป็น hr-immage ของระบบ HR)
const BUCKET_NAME = process.env.R2_WALLCRAFT_BUCKET_NAME || 'wallcraft';
const TARGET_FOLDER = 'original';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5'); 

    // 1. List all files under original/
    let allFiles: _Object[] = [];
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `${TARGET_FOLDER}/`,
        ContinuationToken: continuationToken,
      });
      const response = await s3Client.send(listCommand);
      if (response.Contents) {
        allFiles.push(...response.Contents);
      }
      isTruncated = response.IsTruncated ?? false;
      continuationToken = response.NextContinuationToken;
    }

    // Filter files > 1MB
    const filesToCompress = allFiles
      .filter(file => file.Key !== `${TARGET_FOLDER}/` && (file.Size ?? 0) > 1024 * 1024)
      .slice(0, limit);

    if (filesToCompress.length === 0) {
      return NextResponse.json({ success: true, compressedCount: 0, results: [] });
    }

    const results = [];

    for (const file of filesToCompress) {
      const key = file.Key!;
      const oldSize = file.Size ?? 0;

      // 2. Download from R2
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const getResponse = await s3Client.send(getCommand);
      
      if (!getResponse.Body) {
        throw new Error(`Failed to download file from R2: ${key}`);
      }

      // Convert S3 stream to Buffer
      const fileBuffer = Buffer.from(await getResponse.Body.transformToByteArray());

      // 3. Compress using Sharp
      let quality = 85;
      let compressedBuffer = await sharp(fileBuffer)
        .webp({ quality })
        .toBuffer();

      while (compressedBuffer.length > 1024 * 1024 && quality > 10) {
        quality -= 10;
        compressedBuffer = await sharp(fileBuffer)
          .webp({ quality })
          .toBuffer();
      }

      // 4. Upload back to R2
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: compressedBuffer,
        ContentType: "image/webp",
      });
      await s3Client.send(putCommand);

      results.push({
        name: key.replace(`${TARGET_FOLDER}/`, ''),
        oldSize,
        newSize: compressedBuffer.length,
      });
    }

    return NextResponse.json({
      success: true,
      compressedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Compress All Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
