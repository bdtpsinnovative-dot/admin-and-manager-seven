-- ==============================================================================
-- Migration: เพิ่มระบบกำหนดสิทธิ์เข้าถึงสินค้าตามหมวดหมู่ (Category-Based Inventory Permissions)
-- สำหรับตำแหน่ง data_entry, warehouse, data_analyst, admin
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ allowed_inventory_tabs ในตาราง profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allowed_inventory_tabs text[] 
DEFAULT '{"SLABS","ROUGH","PROP","FURNITURE"}';

-- 2. เพิ่มคำอธิบายคอลัมน์
COMMENT ON COLUMN public.profiles.allowed_inventory_tabs IS 'หมวดสินค้าที่อนุญาตให้เข้าถึงในหน้าคลังสินค้า (/inventory): SLABS, ROUGH, PROP, FURNITURE';

-- 3. อัปเดตข้อมูลพนักงานเดิมที่มีอยู่ให้ได้รับสิทธิ์ครบทุกหมวดเป็นค่าเริ่มต้น
UPDATE public.profiles
SET allowed_inventory_tabs = '{"SLABS","ROUGH","PROP","FURNITURE"}'
WHERE allowed_inventory_tabs IS NULL;
