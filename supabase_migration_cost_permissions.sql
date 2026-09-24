-- ==============================================================================
-- Migration: เพิ่มคอลัมน์ can_view_costs ในตาราง profiles
-- ควบคุมสิทธิ์การดูและจัดการต้นทุนสินค้า (Cost Visibility Permissions)
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ can_view_costs
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_view_costs boolean DEFAULT true;

-- 2. เพิ่มคำอธิบายคอลัมน์
COMMENT ON COLUMN public.profiles.can_view_costs IS 'สิทธิ์ในการมองเห็นและแก้ไขต้นทุนสินค้า (ต้นทุนดอลลาร์ และต้นทุนรวมค่าส่งบาท)';

-- 3. อัปเดตข้อมูลพนักงานเดิมที่มีอยู่ให้ได้รับสิทธิ์ดูต้นทุนเป็นค่าเริ่มต้น
UPDATE public.profiles
SET can_view_costs = true
WHERE can_view_costs IS NULL;
