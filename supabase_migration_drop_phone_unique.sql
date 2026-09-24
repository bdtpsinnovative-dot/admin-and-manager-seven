-- ==============================================================================
-- Migration: ปลดล็อคไม่บังคับเบอร์โทรศัพท์ (phone) ต้องห้ามซ้ำกันในตาราง profiles
-- ==============================================================================
-- วัตถุประสงค์:
-- 1. พนักงาน/เจ้าหน้าที่หลายคนอาจใช้เบอร์โทรศัพท์ของสำนักงาน หรือเบอร์ร้านสาขาเดียวกัน
-- 2. ช่วยให้สามารถบันทึกพนักงานได้แม้จะใช้เบอร์สาขาซ้ำกัน หรือปล่อยว่าง (NULL)
-- 3. ยกเลิกข้อจำกัด profiles_phone_uidx ที่ขวางการบันทึก
-- ==============================================================================

-- 1. ลบ Unique Constraint (ถ้ามี)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_uidx;

-- 2. ลบ Unique Index (ถ้ามี)
DROP INDEX IF EXISTS public.profiles_phone_uidx;

-- 3. ตรวจสอบว่าคอลัมน์ phone เป็น NULLABLE (ยอมรับค่าว่างได้)
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN birth_date DROP NOT NULL;
