-- ==============================================================================
-- 🚀 MIGRATION: ระบบตรวจนับสต็อก 2 ทาง (RFID vs นับสด) พร้อมระบบเปรียบเทียบ & อนุมัติ
-- กรุณานำคำสั่ง SQL ชุดนี้ไปรันใน Supabase Dashboard > SQL Editor นะครับ
-- ==============================================================================

-- 1. ตาราง stock_audits: หัวใบรอบตรวจนับสต็อกของแต่ละสาขา
CREATE TABLE IF NOT EXISTS public.stock_audits (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    audit_code text NOT NULL UNIQUE,
    branch_id bigint NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COUNT_COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- ข้อมูลขั้นตอนที่ Manager ส่งขออนุมัติ
    submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    submitted_at timestamptz,
    submit_notes text,
    
    -- ข้อมูลขั้นตอนที่ Admin อนุมัติปรับสต็อกจริง
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    approval_notes text,
    
    -- ตัวเลขสรุปภาพรวมของรอบนับนี้
    total_system_qty integer NOT NULL DEFAULT 0,
    total_rfid_qty integer NOT NULL DEFAULT 0,
    total_manual_qty integer NOT NULL DEFAULT 0,
    total_final_qty integer NOT NULL DEFAULT 0,
    total_variance_qty integer NOT NULL DEFAULT 0,
    total_variance_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index สำหรับค้นหาตามสาขาและสถานะ
CREATE INDEX IF NOT EXISTS idx_stock_audits_branch_id ON public.stock_audits(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_audits_status ON public.stock_audits(status);
CREATE INDEX IF NOT EXISTS idx_stock_audits_created_at ON public.stock_audits(created_at DESC);


-- 2. ตาราง stock_audit_scans: บันทึกสตรีมการยิงดิบจากเครื่องสแกน PDA แต่ละเครื่อง
CREATE TABLE IF NOT EXISTS public.stock_audit_scans (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    audit_id bigint NOT NULL REFERENCES public.stock_audits(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    count_method text NOT NULL CHECK (count_method IN ('RFID', 'MANUAL_BARCODE')),
    counted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    counted_by_name text,
    device_name text,
    scanned_qty integer NOT NULL DEFAULT 1,
    rfid_epcs jsonb DEFAULT '[]'::jsonb,
    scanned_at timestamptz NOT NULL DEFAULT now()
);

-- Index สำหรับค้นหาการยิงตามรอบนับ และตามสินค้า
CREATE INDEX IF NOT EXISTS idx_stock_audit_scans_audit_id ON public.stock_audit_scans(audit_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_scans_product_id ON public.stock_audit_scans(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_scans_method ON public.stock_audit_scans(count_method);


-- 3. ตาราง stock_audit_items: กระดานสรุปเปรียบเทียบ 3 เสา (ยอดระบบ vs RFID vs นับสด) รายสินค้า
CREATE TABLE IF NOT EXISTS public.stock_audit_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    audit_id bigint NOT NULL REFERENCES public.stock_audits(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    system_qty_before integer NOT NULL DEFAULT 0,
    rfid_qty integer NOT NULL DEFAULT 0,
    manual_qty integer NOT NULL DEFAULT 0,
    final_qty integer NOT NULL DEFAULT 0,
    diff_qty integer NOT NULL DEFAULT 0,
    unit_price numeric(12, 2) NOT NULL DEFAULT 0.00,
    diff_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    diagnosis text NOT NULL DEFAULT 'MATCHED' CHECK (diagnosis IN ('MATCHED', 'TAG_MISSING_SUSPECTED', 'SHRINKAGE_LOST', 'UNEXPECTED_SURPLUS', 'MISCOUNT')),
    reason text,
    manager_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_audit_product UNIQUE (audit_id, product_id)
);

-- Index สำหรับค้นหาตามรอบนับ และตรวจเช็กผลต่าง
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_audit_id ON public.stock_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_product_id ON public.stock_audit_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_diagnosis ON public.stock_audit_items(diagnosis);


-- ==============================================================================
-- 🔒 กำหนดความปลอดภัย Row Level Security (RLS) และสิทธิ์การเข้าถึง
-- ==============================================================================

ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_items ENABLE ROW LEVEL SECURITY;

-- สิทธิ์พื้นฐานสำหรับ PostgREST Data API
GRANT ALL ON TABLE public.stock_audits TO authenticated, service_role;
GRANT ALL ON TABLE public.stock_audit_scans TO authenticated, service_role;
GRANT ALL ON TABLE public.stock_audit_items TO authenticated, service_role;

-- Policies สำหรับ stock_audits
CREATE POLICY "Allow authenticated read stock_audits"
    ON public.stock_audits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert stock_audits"
    ON public.stock_audits FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update stock_audits"
    ON public.stock_audits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies สำหรับ stock_audit_scans
CREATE POLICY "Allow authenticated read stock_audit_scans"
    ON public.stock_audit_scans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert stock_audit_scans"
    ON public.stock_audit_scans FOR INSERT TO authenticated WITH CHECK (true);

-- Policies สำหรับ stock_audit_items
CREATE POLICY "Allow authenticated read stock_audit_items"
    ON public.stock_audit_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert stock_audit_items"
    ON public.stock_audit_items FOR INSERT TO authenticated WITH CHECK (true);

-- Policies สำหรับ stock_audit_items
CREATE POLICY "Allow authenticated update stock_audit_items"
    ON public.stock_audit_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- ⚡ ฟังก์ชันและ TRIGGER อัปเดต updated_at อัตโนมัติ
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_stock_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_audits_updated_at ON public.stock_audits;
CREATE TRIGGER trg_stock_audits_updated_at
    BEFORE UPDATE ON public.stock_audits
    FOR EACH ROW EXECUTE FUNCTION public.set_stock_audit_updated_at();

DROP TRIGGER IF EXISTS trg_stock_audit_items_updated_at ON public.stock_audit_items;
CREATE TRIGGER trg_stock_audit_items_updated_at
    BEFORE UPDATE ON public.stock_audit_items
    FOR EACH ROW EXECUTE FUNCTION public.set_stock_audit_updated_at();
