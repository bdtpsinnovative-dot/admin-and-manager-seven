-- ==============================================================================
-- Migration: อัปเดตกฎฐานข้อมูล (Constraints) ในตาราง profiles
-- 1. รองรับตำแหน่งใหม่: data_entry และ data_analyst (profiles_role_check)
-- 2. รองรับ data_entry และ data_analyst แบบไม่ต้องผูกสาขา (profiles_branch_logic_check)
-- 3. ปลดล็อคไม่ให้เบอร์โทรศัพท์ซ้ำเป็น Error (profiles_phone_uidx)
-- ==============================================================================

-- 1. อัปเดต profiles_role_check ให้รองรับตำแหน่งใหม่
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'manager', 'sale', 'warehouse', 'customer', 'data_entry', 'data_analyst'));

-- 2. อัปเดต profiles_branch_logic_check ให้ data_entry และ data_analyst สามารถอยู่ส่วนกลางได้ (branch_id เป็น NULL ได้)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_branch_logic_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_branch_logic_check 
  CHECK (
    (role IN ('sale', 'manager', 'warehouse') AND branch_id IS NOT NULL)
    OR (role IN ('admin', 'customer', 'data_entry', 'data_analyst'))
  );

-- 3. ปลดล็อค Unique Constraint ของเบอร์โทรศัพท์ (หากมี) เพื่อให้ใช้เบอร์ร้าน/สาขา หรือเว้นว่างได้
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_uidx;
DROP INDEX IF EXISTS public.profiles_phone_uidx;
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN birth_date DROP NOT NULL;
