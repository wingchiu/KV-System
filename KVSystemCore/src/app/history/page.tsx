'use client'

import { useState, useEffect } from 'react'
import { GeneratedImage } from '@/lib/types'
import { getGeneratedImages, deleteGeneratedImage } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import HistoryGrid from '@/components/history/HistoryGrid'

const MOCK_IMAGES: GeneratedImage[] = [
  {
    id: 1,
    image_url: 'https://picsum.photos/800/800?random=1',
    prompt: 'A beautiful coffee scene with natural lighting and warm tones',
    style_id: 1,
    product_id: 1,
    width: 1024,
    height: 1024,
    created_at: new Date().toISOString(),
    is_favorite: true,
    download_count: 15,
    kv_styles: {
      name: 'Life Style',
      image_url: '',
      prompt: '',
      id: 1,
      created_at: ''
    },
    products: {
      name: 'Nescafe Gold',
      description: '',
      image_url: '',
      lora_path: 'nescafe_gold_v1',
      category: 'coffee',
      id: 1,
      created_at: ''
    }
  },
  {
    id: 2,
    image_url: 'https://picsum.photos/800/800?random=2',
    prompt: 'Modern urban setting with coffee cup as focal point',
    style_id: 2,
    product_id: 2,
    width: 1536,
    height: 1024,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    is_favorite: true,
    download_count: 8,
    kv_styles: {
      name: 'Urban',
      image_url: '',
      prompt: '',
      id: 2,
      created_at: ''
    },
    products: {
      name: 'Starbucks Coffee',
      description: '',
      image_url: '',
      lora_path: 'starbucks_v2',
      category: 'coffee',
      id: 2,
      created_at: ''
    }
  },
  {
    id: 3,
    image_url: 'https://picsum.photos/800/800?random=3',
    prompt: 'Minimalist product shot with clean background',
    style_id: 3,
    product_id: 3,
    width: 1024,
    height: 1024,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    is_favorite: true,
    download_count: 12,
    kv_styles: {
      name: 'Minimalist',
      image_url: '',
      prompt: '',
      id: 3,
      created_at: ''
    },
    products: {
      name: 'KitKat',
      description: '',
      image_url: '',
      lora_path: 'kitkat_v1',
      category: 'snacks',
      id: 3,
      created_at: ''
    }
  },
  {
    id: 4,
    image_url: 'https://picsum.photos/800/800?random=4',
    prompt: 'Nature-inspired coffee moment with mountain backdrop',
    style_id: 4,
    product_id: 4,
    width: 1024,
    height: 1024,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    is_favorite: true,
    download_count: 20,
    kv_styles: {
      name: 'Nature',
      image_url: '',
      prompt: '',
      id: 4,
      created_at: ''
    },
    products: {
      name: 'Nespresso',
      description: '',
      image_url: '',
      lora_path: 'nespresso_v2',
      category: 'coffee',
      id: 4,
      created_at: ''
    }
  },
  {
    id: 5,
    image_url: 'https://picsum.photos/800/800?random=5',
    prompt: 'Lifestyle shot with morning coffee routine',
    style_id: 1,
    product_id: 5,
    width: 1024,
    height: 1024,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    is_favorite: false,
    download_count: 5,
    kv_styles: {
      name: 'Life Style',
      image_url: '',
      prompt: '',
      id: 1,
      created_at: ''
    },
    products: {
      name: 'Coffee Mate',
      description: '',
      image_url: '',
      lora_path: 'coffeemate_v1',
      category: 'coffee',
      id: 5,
      created_at: ''
    }
  },
  {
    id: 6,
    image_url: 'https://picsum.photos/800/800?random=6',
    prompt: 'Urban cafe scene with laptop and coffee',
    style_id: 2,
    product_id: 2,
    width: 1024,
    height: 1024,
    created_at: new Date(Date.now() - 432000000).toISOString(),
    is_favorite: false,
    download_count: 3,
    kv_styles: {
      name: 'Urban',
      image_url: '',
      prompt: '',
      id: 2,
      created_at: ''
    },
    products: {
      name: 'Starbucks Coffee',
      description: '',
      image_url: '',
      lora_path: 'starbucks_v2',
      category: 'coffee',
      id: 2,
      created_at: ''
    }
  },
  {
    id: 7,
    image_url: 'https://picsum.photos/800/800?random=7',
    prompt: 'Clean product arrangement with subtle shadows',
    style_id: 3,
    product_id: 6,
    width: 1024,
    height: 1024,
    created_at: new Date(Date.now() - 518400000).toISOString(),
    is_favorite: false,
    download_count: 7,
    kv_styles: {
      name: 'Minimalist',
      image_url: '',
      prompt: '',
      id: 3,
      created_at: ''
    },
    products: {
      name: 'Smarties',
      description: '',
      image_url: '',
      lora_path: 'smarties_v1',
      category: 'snacks',
      id: 6,
      created_at: ''
    }
  },
  {
    id: 8,
    image_url: 'https://picsum.photos/800/800?random=8',
    prompt: 'Mountain stream with refreshing beverage',
    style_id: 4,
    product_id: 7,
    width: 1024,
    height: 1024,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    is_favorite: false,
    download_count: 4,
    kv_styles: {
      name: 'Nature',
      image_url: '',
      prompt: '',
      id: 4,
      created_at: ''
    },
    products: {
      name: 'Perrier',
      description: '',
      image_url: '',
      lora_path: 'perrier_v1',
      category: 'beverages',
      id: 7,
      created_at: ''
    }
  }
]

export default function HistoryPage() {
  const [images, setImages] = useState<GeneratedImage[]>(MOCK_IMAGES)
  const { toast } = useToast()

  useEffect(() => {
    const fetchImages = async () => {
      try {
        // In a real application, we would use this:
        // const data = await getGeneratedImages()
        // setImages(data)
        
        // For now, we're using mock data
        setImages(MOCK_IMAGES)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load generated images",
          variant: "destructive",
        })
      }
    }

    fetchImages()
  }, [toast])

  const handleToggleFavorite = (id: number) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, is_favorite: !img.is_favorite } : img
    ))
  }

  const handleDownload = (id: number) => {
    setImages(images.map(img => {
      if (img.id === id) {
        const link = document.createElement('a')
        link.href = img.image_url
        link.download = `generated-${img.id}.jpg`
        link.click()
        return { ...img, download_count: img.download_count + 1 }
      }
      return img
    }))
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Generation History</h1>
      <HistoryGrid 
        images={images}
        onToggleFavorite={handleToggleFavorite}
        onDownload={handleDownload}
      />
    </div>
  )
}