-- นำคำสั่ง SQL นี้ไปรันใน Supabase SQL Editor นะครับ
-- เพื่อเพิ่มคอลัมน์ใหม่สำหรับรองรับข้อมูลบริษัทและใบกำกับภาษี

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS company_address text,
ADD COLUMN IF NOT EXISTS tax_id text;
