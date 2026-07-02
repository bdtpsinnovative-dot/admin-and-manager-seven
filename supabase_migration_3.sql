-- นำคำสั่ง SQL นี้ไปรันใน Supabase SQL Editor นะครับ
-- เพื่อเพิ่มคอลัมน์ใหม่สำหรับรองรับข้อมูลส่วนลดพิเศษท้ายบิล (แบบ % และแบบ บาท)

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS special_discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_discount_baht numeric DEFAULT 0;
