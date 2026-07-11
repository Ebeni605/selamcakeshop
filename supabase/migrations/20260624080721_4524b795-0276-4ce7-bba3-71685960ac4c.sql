
ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS available_today boolean NOT NULL DEFAULT false;

-- Remap existing items onto the home-page category slugs
UPDATE public.shop_items SET available_today = true WHERE cat = 'Available Today';
UPDATE public.shop_items SET cat = CASE cat
  WHEN 'Wedding'         THEN 'wedding'
  WHEN 'Birthday'        THEN 'birthday-women'
  WHEN 'Graduation'      THEN 'graduation'
  WHEN 'Kerestena'       THEN 'christening'
  WHEN 'Yeshemgelena'    THEN 'baby-shower'
  WHEN 'Fasting'         THEN 'mini-cake'
  WHEN 'Available Today' THEN 'mini-cake'
  ELSE cat
END
WHERE cat IN ('Wedding','Birthday','Graduation','Kerestena','Yeshemgelena','Fasting','Available Today');

-- Replace the categories table with the home page set
DELETE FROM public.shop_categories;

INSERT INTO public.shop_categories (key, title, sub, badge, img, sort_order) VALUES
  ('bridal-shower',   'Bridal Shower',          'Elegant pre-wedding cakes',     'Bridal',  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop', 10),
  ('baby-shower',     'Baby Shower',            'Sweet welcomes for little ones','Baby',    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=600&fit=crop', 20),
  ('christening',     'Christening',            'Blessed celebration cakes',     'Holy',    'https://images.unsplash.com/photo-1557925923-cd4648e211a0?w=800&h=600&fit=crop', 30),
  ('engagement',      'Engagement',             'Mark the proposal in style',    'Love',    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&h=600&fit=crop', 40),
  ('six-month',       '6-Month',                'Half-birthday milestone cakes', '6M',      'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800&h=600&fit=crop', 50),
  ('cake-package',    'Cake & Package',         'Curated sweet gift boxes',      'Gift',    'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800&h=600&fit=crop', 60),
  ('graduation-kids', 'Graduation for Kids',    'Cheer little graduates',        'Kids',    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop', 70),
  ('nikah',           'Nikah',                  'Romantic nikah celebration',    'Nikah',   'https://images.unsplash.com/photo-1622896784083-cc051313dbab?w=800&h=600&fit=crop', 80),
  ('mini-cake',       'Mini Cake',              'Single-serve sweet treats',     'Mini',    'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&h=600&fit=crop', 90),
  ('torta',           'Torta',                  'Creamy layered classics',       'Torta',   'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&h=600&fit=crop', 100),
  ('graduation',      'Graduation',             'Celebrate achievements',        'Grad',    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=600&fit=crop', 110),
  ('birthday-girls',  'Birthday — Girls',       'Themed cakes for girls',        'Girls',   'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800&h=600&fit=crop', 120),
  ('birthday-boys',   'Birthday — Boys',        'Fun cakes for boys',            'Boys',    'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop', 130),
  ('birthday-women',  'Birthday — Women',       'Elegant cakes for her',         'Women',   'https://images.unsplash.com/photo-1557925923-cd4648e211a0?w=800&h=600&fit=crop', 140),
  ('birthday-men',    'Birthday — Men',         'Bold cakes for him',            'Men',     'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop', 150),
  ('proposal',        'Proposal',               'Will-you-marry-me cakes',       'Romance', 'https://images.unsplash.com/photo-1551106652-a5bcf4b29ab6?w=800&h=600&fit=crop', 160),
  ('anniversary',     'Anniversary',            'Celebrate your milestones',     'Anniv',   'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800&h=600&fit=crop', 170),
  ('wedding',         'Wedding',                'Timeless elegance',             'Love',    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&h=600&fit=crop', 180),
  ('evangelina',      'Evangelina',             'Signature custom designs',      'Custom',  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop', 190);
