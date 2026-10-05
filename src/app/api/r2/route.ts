import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand, CopyObjectCommand, _Object } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ใช้ bucket 'wallcraft' เสมอสำหรับคลังรูปภาพหลัก (ไม่ดึง R2_BUCKET_NAME ซึ่งเป็น hr-immage ของระบบ HR)
const BUCKET_NAME = process.env.R2_WALLCRAFT_BUCKET_NAME || 'wallcraft';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '40');
    const offset = parseInt(searchParams.get('offset') || '0');
    const folder = searchParams.get('folder') || 'original'; 
    const over1MB = searchParams.get('over1MB') === 'true';

    let allFiles: _Object[] = []; 
    let isTruncated: boolean = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const command: ListObjectsV2Command = new ListObjectsV2Command({ 
        Bucket: BUCKET_NAME,
        Prefix: `${folder}/`,
        ContinuationToken: continuationToken
      });
      
      const response = await s3Client.send(command);
      
      if (response.Contents) {
        allFiles.push(...response.Contents);
      }
      
      isTruncated = response.IsTruncated ?? false;
      continuationToken = response.NextContinuationToken;
    }

    let files = allFiles.filter(file => file.Key !== `${folder}/`);
    
    if (over1MB) {
      files = files.filter(file => (file.Size ?? 0) > 1024 * 1024);
    }

    files.sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

    const paginatedFiles = files.slice(offset, offset + limit);

    const images = paginatedFiles.map(file => {
      const cleanName = file.Key?.replace(`${folder}/`, '') || '';
      return {
        name: cleanName,
        url: `${PUBLIC_URL}/${file.Key}`,
        updatedAt: file.LastModified?.getTime() || Date.now(),
        size: file.Size ?? 0
      };
    });

    return NextResponse.json({ images, totalCount: files.length });
  } catch (error: any) {
    console.error("R2 GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const folder = (formData.get('folder') as string) || 'original'; 
    if (!file || !fileName) return NextResponse.json({ error: "Missing file or filename" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${folder}/${fileName}`,
      Body: buffer,
      ContentType: file.type,
    });
    await s3Client.send(command);
    return NextResponse.json({ success: true, url: `${PUBLIC_URL}/${folder}/${fileName}` });
  } catch (error: any) {
    console.error("R2 POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { fileNames, folder = 'original' } = await request.json(); 
    if (!fileNames || !Array.isArray(fileNames)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: fileNames.map(name => ({ Key: `${folder}/${name}` })) }
    });
    await s3Client.send(command);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("R2 DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { oldName, newName, folder = 'original' } = await request.json();
    if (!oldName || !newName) {
      return NextResponse.json({ error: "Missing oldName or newName" }, { status: 400 });
    }

    const cleanNewName = newName.trim();
    if (!cleanNewName) {
      return NextResponse.json({ error: "Invalid newName" }, { status: 400 });
    }

    // 1. Copy object to new key
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${folder}/${oldName}`,
      Key: `${folder}/${cleanNewName}`,
    });
    await s3Client.send(copyCommand);

    // 2. Delete original object
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: [{ Key: `${folder}/${oldName}` }] },
    });
    await s3Client.send(deleteCommand);

    return NextResponse.json({ 
      success: true, 
      name: cleanNewName, 
      url: `${PUBLIC_URL}/${folder}/${cleanNewName}` 
    });
  } catch (error: any) {
    console.error("R2 RENAME Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
