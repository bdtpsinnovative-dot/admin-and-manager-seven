-- ==============================================================================
-- 🚀 MIGRATION: แก้ไข RPC Function ให้ตรงกับ DataType ของตาราง products 100%
-- รันคำสั่งนี้ใน Supabase SQL Editor ได้เลยครับ
-- ==============================================================================

-- 1. ลบ Function เดิมก่อน
DROP FUNCTION IF EXISTS match_products_by_image_embedding(vector, integer, text);
DROP FUNCTION IF EXISTS match_products_by_image_embedding(vector, int, text);

-- 2. สร้างใหม่โดยใช้ DataType ที่ตรงกับ PostgreSQL ชัวร์ 100%
CREATE OR REPLACE FUNCTION match_products_by_image_embedding(
  query_embedding vector(512),
  match_count int DEFAULT 8,
  category_filter text DEFAULT 'prop'
)
RETURNS TABLE (
  id bigint,
  name text,
  sku text,
  price numeric,
  image_url text,
  status text,
  collection_group_id text,
  category_id text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id::bigint,
    p.name::text,
    p.sku::text,
    p.price::numeric,
    p.image_url::text,
    p.status::text,
    p.collection_group_id::text,
    p.category_id::text,
    (1.0 - (p.image_embedding <=> query_embedding))::float AS similarity
  FROM public.products p
  WHERE
    p.category_id::text = category_filter
    AND p.image_embedding IS NOT NULL
    AND p.image_url IS NOT NULL
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
$$;
