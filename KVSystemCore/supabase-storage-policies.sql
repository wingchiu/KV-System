-- Create the styles bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('styles', 'styles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to all files in the styles bucket
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
USING (bucket_id = 'styles')
WITH CHECK (bucket_id = 'styles');

-- Create the products bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to all files in the products bucket
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');