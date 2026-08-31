-- ==============================================================================
-- 🚀 MIGRATION: ตารางส่วนลดและคูปอง Collection สำหรับเว็บ Terra
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.terra_collection_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    collection_group_id VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'auto', -- 'auto' | 'coupon'
    coupon_code VARCHAR(100) UNIQUE,
    discount_type VARCHAR(50) NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed_amount'
    discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_sets INTEGER NOT NULL DEFAULT 1,
    max_discount_amount NUMERIC(10, 2),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index เพื่อความรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_terra_promotions_code ON public.terra_collection_promotions (coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_terra_promotions_collection ON public.terra_collection_promotions (collection_group_id);
CREATE INDEX IF NOT EXISTS idx_terra_promotions_active ON public.terra_collection_promotions (is_active);

-- Enable RLS
ALTER TABLE public.terra_collection_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active terra promotions" ON public.terra_collection_promotions;
CREATE POLICY "Public read active terra promotions" ON public.terra_collection_promotions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage terra promotions" ON public.terra_collection_promotions;
CREATE POLICY "Admin manage terra promotions" ON public.terra_collection_promotions
  FOR ALL USING (true);
