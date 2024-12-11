-- Insert KV Styles
INSERT INTO public.kv_styles (name, image_url, prompt)
VALUES
  ('Life Style', '/styles/lifestyle.jpg', 'Create a lifestyle photography scene with natural lighting, casual atmosphere, and authentic moments'),
  ('Nature', '/styles/nature.jpg', 'Capture natural landscapes with dramatic lighting, vibrant colors, and organic compositions'),
  ('Product Focus', '/styles/product.jpg', 'Studio product photography with clean background, sharp details, and professional lighting'),
  ('Urban', '/styles/urban.jpg', 'Urban street photography with modern architecture, city life, and dynamic compositions'),
  ('Minimalist', '/styles/minimalist.jpg', 'Minimalist style with simple compositions, negative space, and subtle color palettes');

-- Insert Products
INSERT INTO public.products (name, description, image_url, category)
VALUES
  -- Coffee Category
  ('Nescafe Gold', 'Premium instant coffee blend', '/products/nescafe-gold.png', 'coffee'),
  ('Nespresso Vertuo', 'Premium coffee capsules', '/products/nespresso.png', 'coffee'),
  ('Starbucks Coffee', 'Premium ground coffee', '/products/starbucks.png', 'coffee'),
  ('Coffee Mate', 'Coffee creamer', '/products/coffeemate.png', 'coffee'),
  ('Nescafe 3-in-1', 'Instant coffee mix', '/products/nescafe-3in1.png', 'coffee'),

  -- Snacks Category
  ('KitKat Original', 'Chocolate-covered wafer bars', '/products/kitkat.png', 'snacks'),
  ('KitKat Matcha', 'Green tea flavored KitKat', '/products/kitkat-matcha.png', 'snacks'),
  ('Crunch', 'Chocolate bar with crisped rice', '/products/crunch.png', 'snacks'),
  ('Smarties', 'Colorful chocolate candies', '/products/smarties.png', 'snacks'),
  ('Aero', 'Aerated chocolate bar', '/products/aero.png', 'snacks'),

  -- Beverages Category
  ('Nestea Lemon', 'Lemon flavored iced tea', '/products/nestea.png', 'beverages'),
  ('Milo', 'Chocolate malt drink', '/products/milo.png', 'beverages'),
  ('Nesquik', 'Chocolate flavored milk', '/products/nesquik.png', 'beverages'),
  ('Pure Life', 'Natural spring water', '/products/pure-life.png', 'beverages'),
  ('Perrier', 'Sparkling mineral water', '/products/perrier.png', 'beverages');