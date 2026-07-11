
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cake_id text REFERENCES public.shop_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_cake_id_idx ON public.orders(cake_id);
CREATE INDEX IF NOT EXISTS orders_category_id_idx ON public.orders(category_id);

-- Backfill from the first item's name where possible
UPDATE public.orders o
SET cake_id = si.id,
    category_id = sc.id
FROM public.shop_items si
LEFT JOIN public.shop_categories sc ON sc.key = si.cat
WHERE o.cake_id IS NULL
  AND o.items IS NOT NULL
  AND jsonb_typeof(o.items) = 'array'
  AND jsonb_array_length(o.items) > 0
  AND lower(o.items->0->>'name') = lower(si.name);
