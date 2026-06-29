-- เปลี่ยนชื่อคอลัมน์เดิมเป็น company_name_th (ภาษาไทย)
ALTER TABLE public.orders RENAME COLUMN company_name TO company_name_th;

-- เพิ่มคอลัมน์ใหม่ company_name_en (ภาษาอังกฤษ)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_name_en text;
