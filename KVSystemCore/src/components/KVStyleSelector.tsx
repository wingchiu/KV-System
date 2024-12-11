'use client'

import { Card } from './ui/card'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Maximize2, ChevronRight, ChevronLeft } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogTitle 
} from './ui/dialog'
import { KVStyle } from '@/lib/types'
import { useToast } from './ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useStyle } from '@/lib/contexts/StyleContext'

export default function KVStyleSelector() {
  const [styles, setStyles] = useState<KVStyle[]>([])
  const [startIndex, setStartIndex] = useState(0)
  const { toast } = useToast()
  const { selectedStyle, setSelectedStyle } = useStyle()

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const { data, error } = await supabase
          .from('kv_styles')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setStyles(data || [])
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load KV styles",
          variant: "destructive",
        })
      }
    }
    fetchStyles()
  }, [toast])

  const visibleStyles = styles.slice(startIndex, startIndex + 4)
  const canScrollLeft = startIndex > 0
  const canScrollRight = startIndex + 4 < styles.length

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left' && canScrollLeft) {
      setStartIndex(startIndex - 1)
    } else if (direction === 'right' && canScrollRight) {
      setStartIndex(startIndex + 1)
    }
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleStyles.map((style) => (
          <Card
            key={style.id}
            className={`p-2 cursor-pointer transition-all hover:ring-2 hover:ring-red-500 
              ${selectedStyle?.id === style.id ? 'ring-2 ring-red-500' : ''} relative`}
            onClick={() => setSelectedStyle(style)}
          >
            <Dialog>
              <DialogTrigger asChild>
                <button 
                  className="absolute top-4 right-4 z-10 p-1.5 bg-white/80 hover:bg-white rounded-md transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[90vw] p-1">
                <DialogTitle className="sr-only">
                  {style.name} Style Preview
                </DialogTitle>
                <div className="relative w-full aspect-[16/9]">
                  <Image
                    src={style.image_url}
                    alt={style.name}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="aspect-square relative mb-2 rounded-lg overflow-hidden">
              <Image
                src={style.image_url}
                alt={style.name}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-center font-medium">{style.name}</p>
          </Card>
        ))}
      </div>

      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}