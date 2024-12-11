'use client'

import { GeneratedImage } from '@/lib/types'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Download, Heart, Maximize2 } from 'lucide-react'
import ImageDetails from './ImageDetails'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface HistoryGridProps {
  images: GeneratedImage[]
  onToggleFavorite: (id: number) => void
  onDownload: (id: number) => void
}

export default function HistoryGrid({ images, onToggleFavorite, onDownload }: HistoryGridProps) {
  // Sort images: favorites first, then by date
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1
    if (!a.is_favorite && b.is_favorite) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Get favorites for the top row
  const favorites = sortedImages.filter(img => img.is_favorite).slice(0, 4)
  const nonFavorites = sortedImages.filter(img => !img.is_favorite)

  return (
    <div className="space-y-8">
      {favorites.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Favorites</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {favorites.map((image) => (
              <ImageCard 
                key={image.id} 
                image={image}
                onToggleFavorite={onToggleFavorite}
                onDownload={onDownload}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Generations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {nonFavorites.map((image) => (
            <ImageCard 
              key={image.id} 
              image={image}
              onToggleFavorite={onToggleFavorite}
              onDownload={onDownload}
            />
          ))}
        </div>
      </div>

      {images.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No generated images yet
        </div>
      )}
    </div>
  )
}

interface ImageCardProps {
  image: GeneratedImage
  onToggleFavorite: (id: number) => void
  onDownload: (id: number) => void
}

function ImageCard({ image, onToggleFavorite, onDownload }: ImageCardProps) {
  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-square">
        <Image
          src={image.image_url}
          alt={image.prompt}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <button 
            className="z-10 p-1.5 bg-white/80 hover:bg-white rounded-md transition-colors"
            onClick={() => onToggleFavorite(image.id)}
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-colors",
                image.is_favorite ? "fill-red-500 stroke-red-500" : "stroke-gray-600"
              )} 
            />
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button 
                className="z-10 p-1.5 bg-white/80 hover:bg-white rounded-md transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[90vw]">
              <DialogTitle className="sr-only">
                Generated Image Details
              </DialogTitle>
              <ImageDetails 
                image={image}
                onDownload={() => onDownload(image.id)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm text-gray-600 line-clamp-2">{image.prompt}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(image.created_at)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onDownload(image.id)}
          >
            <Download className="h-3 w-3 mr-1" />
            {image.download_count}
          </Button>
        </div>
      </div>
    </Card>
  )
}