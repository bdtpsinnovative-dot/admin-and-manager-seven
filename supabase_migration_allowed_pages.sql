-- เพิ่มคอลัมน์ allowed_pages สำหรับเก็บรายการหน้าเมนูที่พนักงานแต่ละคนได้รับอนุญาตให้เข้าใช้งาน
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allowed_pages text[] DEFAULT NULL;

COMMENT ON COLUMN public.profiles.allowed_pages IS 'รายการ path หน้าเมนูที่อนุญาตให้พนักงานเข้าถึงในระบบ Admin (เช่น /inventory, /stock-in, /dashboard)';
