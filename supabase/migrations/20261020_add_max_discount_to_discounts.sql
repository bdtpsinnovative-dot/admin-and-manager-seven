-- Run this once in the Supabase SQL Editor if you wish to persist max_discount directly on the discounts table:
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS max_discount numeric DEFAULT NULL;
