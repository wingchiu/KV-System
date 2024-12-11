-- Enable Row Level Security (RLS) for kv_styles table
ALTER TABLE public.kv_styles ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies
DROP POLICY IF EXISTS "Authenticated Delete" ON public.kv_styles;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.kv_styles;
DROP POLICY IF EXISTS "Authenticated Update" ON public.kv_styles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kv_styles;
DROP POLICY IF EXISTS "Public Access" ON public.kv_styles;
DROP POLICY IF EXISTS "Public Read Access" ON public.kv_styles;
DROP POLICY IF EXISTS "Public Write Access" ON public.kv_styles;

-- Create a single policy for full public access to kv_styles
CREATE POLICY "Full Public Access"
ON public.kv_styles
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable Row Level Security (RLS) for products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies for products
DROP POLICY IF EXISTS "Public Access" ON public.products;
DROP POLICY IF EXISTS "Public Read Access" ON public.products;
DROP POLICY IF EXISTS "Public Write Access" ON public.products;

-- Create a single policy for full public access to products
CREATE POLICY "Full Public Access"
ON public.products
FOR ALL
TO public
USING (true)
WITH CHECK (true);