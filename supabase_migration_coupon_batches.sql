-- ==============================================================================
-- 🚀 MIGRATION: ตารางกลุ่มชุดคูปอง (coupon_batches) และเชื่อมโยง batch_id
-- ==============================================================================

-- 1. สร้างตารางแม่สำหรับกลุ่มชุดคูปอง (coupon_batches)
CREATE TABLE IF NOT EXISTS public.coupon_batches (
    id VARCHAR(100) PRIMARY KEY,
    batch_code VARCHAR(100) UNIQUE,
    title VARCHAR(255) NOT NULL,
    lead_sales VARCHAR(100) NOT NULL,
    partner_company VARCHAR(255),
    partner_sales VARCHAR(255),
    note TEXT,
    discount_type VARCHAR(50) NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed_amount'
    discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_spend NUMERIC(10, 2) DEFAULT 0,
    max_discount_amount NUMERIC(10, 2),
    is_tiered BOOLEAN NOT NULL DEFAULT false,
    tiers JSONB,
    is_top_up BOOLEAN NOT NULL DEFAULT true,
    total_count INTEGER NOT NULL DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    usage_limit INTEGER DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. เพิ่มคอลัมน์ batch_id ในตาราง terra_collection_promotions (ถ้ายังไม่มี)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='terra_collection_promotions' AND column_name='batch_id'
  ) THEN
    ALTER TABLE public.terra_collection_promotions 
      ADD COLUMN batch_id VARCHAR(100);
  END IF;
END $$;

-- 3. สร้าง Index เพื่อความรวดเร็วในการ Query ตามกลุ่ม
CREATE INDEX IF NOT EXISTS idx_terra_promotions_batch_id ON public.terra_collection_promotions (batch_id);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_lead_sales ON public.coupon_batches (lead_sales);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_partner ON public.coupon_batches (partner_company);

-- 4. ย้ายข้อมูล batch_id จาก JSON ใน description ของเดิมมาลงคอลัมน์ใหม่ (Backfill)
UPDATE public.terra_collection_promotions
SET batch_id = (description::json->>'batch_id')
WHERE batch_id IS NULL 
  AND description IS NOT NULL 
  AND description LIKE '{"%batch_id%';

-- 5. Enable RLS และสร้าง Policies
ALTER TABLE public.coupon_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read coupon_batches" ON public.coupon_batches;
CREATE POLICY "Public read coupon_batches" ON public.coupon_batches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage coupon_batches" ON public.coupon_batches;
CREATE POLICY "Admin manage coupon_batches" ON public.coupon_batches
  FOR ALL USING (true);

-- รีโหลด Schema Cache ของ PostgREST ทันที
NOTIFY pgrst, 'reload schema';
