import { KVStyle, Product, GeneratedImage } from './types'

// KV Styles
export async function getKVStyles(): Promise<KVStyle[]> {
  const res = await fetch('/api/styles')
  if (!res.ok) throw new Error('Failed to fetch KV styles')
  return res.json()
}

export async function createKVStyle(style: Partial<KVStyle>): Promise<KVStyle> {
  const res = await fetch('/api/styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(style),
  })
  if (!res.ok) throw new Error('Failed to create KV style')
  return res.json()
}

export async function deleteKVStyle(id: number): Promise<void> {
  const res = await fetch(`/api/styles?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete KV style')
}

// Products
export async function getProducts(category?: string): Promise<Product[]> {
  const url = category ? `/api/products?category=${category}` : '/api/products'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })
  if (!res.ok) throw new Error('Failed to create product')
  return res.json()
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete product')
}

// Generated Images
export async function getGeneratedImages(userId: string): Promise<GeneratedImage[]> {
  const res = await fetch(`/api/images?userId=${userId}`)
  if (!res.ok) throw new Error('Failed to fetch generated images')
  return res.json()
}

export async function createGeneratedImage(image: Partial<GeneratedImage> & { user_id: string }): Promise<GeneratedImage> {
  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(image),
  })
  if (!res.ok) throw new Error('Failed to create generated image')
  return res.json()
}

export async function deleteGeneratedImage(id: number, userId: string): Promise<void> {
  const res = await fetch(`/api/images?id=${id}&userId=${userId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete generated image')
}