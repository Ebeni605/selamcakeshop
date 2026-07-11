
-- 1. shop_categories table
CREATE TABLE public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  sub TEXT NOT NULL DEFAULT '',
  badge TEXT NOT NULL DEFAULT '',
  img TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_categories TO authenticated;
GRANT ALL ON public.shop_categories TO service_role;

ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop categories"
  ON public.shop_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert shop categories"
  ON public.shop_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shop categories"
  ON public.shop_categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shop categories"
  ON public.shop_categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shop_categories_updated_at
  BEFORE UPDATE ON public.shop_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_categories;

-- 2. Seed initial categories matching the admin/storefront catalog
INSERT INTO public.shop_categories (key, title, sub, badge, img, sort_order) VALUES
  ('Fasting',          'Fasting',          'Vegan & fasting-friendly cakes',     'Fasting',  'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800&h=600&fit=crop', 10),
  ('Kerestena',        'Kerestena',        'Christmas season specials',          'Holiday',  'https://images.unsplash.com/photo-1557925923-cd4648e211a0?w=800&h=600&fit=crop', 20),
  ('Yeshemgelena',     'Yeshemgelena',     'Engagement & promise cakes',         'Love',     'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&h=600&fit=crop', 30),
  ('Graduation',       'Graduation',       'Celebrate achievements',             'Grad',     'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=600&fit=crop', 40),
  ('Wedding',          'Wedding',          'Timeless elegant tiers',             'Bridal',   'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop', 50),
  ('Birthday',         'Birthday',         'Themed birthday cakes',              'Birthday', 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800&h=600&fit=crop', 60),
  ('Available Today',  'Available Today',  'Ready-to-pickup cakes',              'Today',    'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&h=600&fit=crop', 70)
ON CONFLICT (key) DO NOTHING;
