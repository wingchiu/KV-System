'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Wand2, Pencil } from 'lucide-react'
import Image from 'next/image'

interface BackgroundListProps {
  backgrounds: any[]
  onDelete: (id: number) => void
  onMagicPrompt: (id: number) => Promise<void>
  vlmLoading: boolean
}

export default function BackgroundList({ backgrounds, onDelete, onMagicPrompt, vlmLoading }: BackgroundListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {backgrounds.map((background) => (
        <Card key={background.id} className="p-4 space-y-4">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src={background.image_url}
              alt={background.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <button 
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition"
              onClick={() => {}}
            >
              <Pencil className="h-4 w-4 text-white" />
            </button>
          </div>
          <div>
            <h3 className="font-semibold truncate">{background.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{background.prompt}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => onDelete(background.id)}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => onMagicPrompt(background.id)}
              disabled={vlmLoading}
            >
              {vlmLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Magic Prompt
                </>
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
