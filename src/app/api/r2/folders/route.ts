// src/app/api/r2/folders/route.ts
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

const BUCKET_NAME = process.env.R2_WALLCRAFT_BUCKET_NAME || 'wallcraft';
const INTERNS_PREFIX = 'interns/';

export interface FolderItem {
  id: string;
  name: string;
  isProtected: boolean;
}

// GET: ดึงรายการโฟลเดอร์ทั้งหมด (โฟลเดอร์หลัก original + โฟลเดอร์น้องฝึกงานใน interns/)
export async function GET() {
  try {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: INTERNS_PREFIX,
      Delimiter: '/',
    });
    const response = await s3Client.send(listCommand);

    const internFolders: FolderItem[] = (response.CommonPrefixes || []).map((cp) => {
      const fullPrefix = cp.Prefix || '';
      // เช่น Prefix: 'interns/น้องมิว/' -> cleanName = 'น้องมิว'
      const cleanName = fullPrefix.replace(INTERNS_PREFIX, '').replace(/\/$/, '');
      return {
        id: `interns/${cleanName}`,
        name: cleanName,
        isProtected: false,
      };
    }).filter(f => Boolean(f.name));

    // โฟลเดอร์หลัก original (มีรหัสผ่านป้องกัน oom1234)
    const masterFolder: FolderItem = {
      id: 'original',
      name: 'โฟลเดอร์หลัก (Original)',
      isProtected: true,
    };

    return NextResponse.json({
      folders: [masterFolder, ...internFolders],
    });
  } catch (error: any) {
    console.error("List Folders Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: สร้างโฟลเดอร์ใหม่ให้น้องฝึกงาน (สร้างไฟล์ .keep ไว้ใต้ interns/{folderName}/)
export async function POST(request: Request) {
  try {
    const { folderName } = await request.json();
    if (!folderName || typeof folderName !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุชื่อโฟลเดอร์' }, { status: 400 });
    }

    // ล้างชื่อโฟลเดอร์ ป้องกัน slash, dot-dot
    const cleanName = folderName.trim().replace(/[\/\\:*?"<>|]/g, '_');
    if (!cleanName || cleanName.length < 1) {
      return NextResponse.json({ error: 'ชื่อโฟลเดอร์ไม่ถูกต้อง' }, { status: 400 });
    }

    if (cleanName.toLowerCase() === 'original') {
      return NextResponse.json({ error: 'ไม่สามารถใช้ชื่อ original ซ้ำได้' }, { status: 400 });
    }

    const folderKey = `${INTERNS_PREFIX}${cleanName}/.keep`;

    // ใส่ไฟล์ placeholder .keep เพื่อให้ R2 มองเห็นเป็น folder
    const putCommand: PutObjectCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: folderKey,
      Body: Buffer.from(''),
      ContentType: 'application/x-directory',
    });
    await s3Client.send(putCommand);

    const newFolder: FolderItem = {
      id: `interns/${cleanName}`,
      name: cleanName,
      isProtected: false,
    };

    return NextResponse.json({
      success: true,
      folder: newFolder,
    });
  } catch (error: any) {
    console.error("Create Folder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: ลบโฟลเดอร์น้องฝึกงาน
export async function DELETE(request: Request) {
  try {
    const { folderId } = await request.json();
    if (!folderId || typeof folderId !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุโฟลเดอร์ที่จะลบ' }, { status: 400 });
    }

    if (folderId === 'original' || !folderId.startsWith(INTERNS_PREFIX)) {
      return NextResponse.json({ error: 'ไม่อนุญาตให้ลบโฟลเดอร์หลักนี้' }, { status: 403 });
    }

    // 1. ดึงไฟล์ทั้งหมดในโฟลเดอร์นี้
    const prefix = folderId.endsWith('/') ? folderId : `${folderId}/`;
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });
      const listRes = await s3Client.send(listCommand);

      if (listRes.Contents && listRes.Contents.length > 0) {
        const deleteCommand: DeleteObjectsCommand = new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: listRes.Contents.map((obj) => ({ Key: obj.Key })),
          },
        });
        await s3Client.send(deleteCommand);
      }

      isTruncated = listRes.IsTruncated ?? false;
      continuationToken = listRes.NextContinuationToken;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Folder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
