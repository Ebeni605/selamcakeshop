
-- Add delivery_date column for structured storage
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date date;

-- Normalize status values to new vocabulary
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending';
UPDATE public.orders SET status = 'pending' WHERE status IN ('new');
UPDATE public.orders SET status = 'processing' WHERE status IN ('preparing');
UPDATE public.orders SET status = 'completed' WHERE status IN ('done');
