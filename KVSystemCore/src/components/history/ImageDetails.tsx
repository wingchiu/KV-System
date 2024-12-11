'use client'

import { GeneratedImage } from '@/lib/types'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DialogTitle } from '@/components/ui/dialog'

interface ImageDetailsProps {
  image: GeneratedImage
  onDownload: () => void
}

export default function ImageDetails({ image, onDownload }: ImageDetailsProps) {
  const aspectRatio = image.width / image.height
  const maxHeight = Math.min(window.innerHeight * 0.6, 600) // 60% of viewport height or 600px
  const width = aspectRatio >= 1 ? maxHeight * aspectRatio : maxHeight
  const height = aspectRatio >= 1 ? maxHeight : maxHeight / aspectRatio

  return (
    <div className="space-y-4">
      <DialogTitle className="text-lg font-semibold">
        Generated Image Details
      </DialogTitle>

      <div className="relative mx-auto" style={{ width: `${width}px`, height: `${height}px` }}>
        <Image
          src={image.image_url}
          alt={image.prompt}
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="space-y-3 max-h-[200px] overflow-y-auto">
        <div>
          <h3 className="text-sm font-semibold mb-1">Prompt</h3>
          <p className="text-sm text-gray-600">{image.prompt}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <h3 className="text-sm font-semibold mb-1">Style</h3>
            <p className="text-sm text-gray-600">{image.kv_styles?.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Product</h3>
            <p className="text-sm text-gray-600">{image.products?.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Resolution</h3>
            <p className="text-sm text-gray-600">{image.width} × {image.height}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Generated</h3>
            <p className="text-sm text-gray-600">{formatDate(image.created_at)}</p>
          </div>
          {image.products?.lora_path && (
            <div className="col-span-2">
              <h3 className="text-sm font-semibold mb-1">Lora Model</h3>
              <p className="text-sm text-gray-600">{image.products.lora_path}</p>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          className="w-full mt-2"
          onClick={onDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Image
        </Button>
      </div>
    </div>
  )
}