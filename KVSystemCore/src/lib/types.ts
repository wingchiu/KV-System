export interface KVStyle {
  id: number
  name: string
  image_url: string
  prompt: string
  created_at: string
}

export interface Product {
  id: number
  name: string
  description: string
  image_url: string
  lora_path: string
  category: 'coffee' | 'snacks' | 'beverages'
  product_type: string
  created_at: string
}

export interface GeneratedImage {
  id: number
  image_url: string
  prompt: string
  style_id: number
  product_id: number
  width: number
  height: number
  created_at: string
  kv_styles?: KVStyle
  products?: Product
  is_favorite: boolean
  download_count: number
}

export interface ImageGeneration {
  id: string
  filename: string | null
  prompt: string | null
  negative_prompt: string | null
  style: string | null
  product: string | null
  resolution: string | null
  lora_model: string | null
  generated_at: string | null
  image_url: string | null
  seed: number | null
  node_id: string | null
  favorite: boolean | null
}