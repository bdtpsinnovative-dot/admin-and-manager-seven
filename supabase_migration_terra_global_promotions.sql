-- ==============================================================================
-- 🚀 MIGRATION: เพิ่มการรองรับ Global Coupons และ Auto Set Promotions
-- ==============================================================================

-- 1. ทำให้ collection_group_id เป็น NULL ได้ (สำหรับคูปอง Global)
ALTER TABLE public.terra_collection_promotions 
  ALTER COLUMN collection_group_id DROP NOT NULL;

-- 2. เพิ่มคอลัมน์ promo_scope ('set' หรือ 'global')
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='terra_collection_promotions' AND column_name='promo_scope'
  ) THEN
    ALTER TABLE public.terra_collection_promotions 
      ADD COLUMN promo_scope VARCHAR(50) NOT NULL DEFAULT 'set';
  END IF;
END $$;

-- 3. เพิ่มคอลัมน์ min_spend (กำหนดยอดซื้อขั้นต่ำสำหรับ Global Coupon)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='terra_collection_promotions' AND column_name='min_spend'
  ) THEN
    ALTER TABLE public.terra_collection_promotions 
      ADD COLUMN min_spend NUMERIC(10, 2) DEFAULT 0;
  END IF;
END $$;

-- 4. ปรับปรุงข้อมูลเก่า
UPDATE public.terra_collection_promotions
SET promo_scope = CASE 
  WHEN trigger_type = 'auto' THEN 'set'
  WHEN trigger_type = 'coupon' AND (collection_group_id IS NULL OR collection_group_id = '' OR collection_group_id = 'global') THEN 'global'
  ELSE 'set'
END
WHERE promo_scope IS NULL OR promo_scope = 'set';

-- Index เพิ่มเติม
CREATE INDEX IF NOT EXISTS idx_terra_promotions_scope ON public.terra_collection_promotions (promo_scope);

-- รีโหลด Schema Cache ของ PostgREST ทันที
NOTIFY pgrst, 'reload schema';

