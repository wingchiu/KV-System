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

export default function BGStyleSelector() {
  const [styles, setStyles] = useState<KVStyle[]>([])
  const [startIndex, setStartIndex] = useState(0)
  const { toast } = useToast()
  const { selectedStyle, setSelectedStyle } = useStyle()

  const itemsPerPage = 4
  const canScrollLeft = startIndex > 0
  const canScrollRight = startIndex + itemsPerPage < styles.length

  const scrollLeft = () => {
    if (canScrollLeft) {
      setStartIndex(prev => Math.max(0, prev - itemsPerPage))
    }
  }

  const scrollRight = () => {
    if (canScrollRight) {
      setStartIndex(prev => Math.min(styles.length - itemsPerPage, prev + itemsPerPage))
    }
  }

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        console.log('Fetching backgrounds...')
        const { data, error } = await supabase
          .from('backgrounds')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        console.log('Backgrounds data:', data)

        const transformedData = data?.map(bg => ({
          id: bg.id,
          name: bg.name || 'Background',
          image_url: bg.image_url,
          prompt: bg.prompt || '',
          created_at: bg.created_at
        })) || []
        console.log('Transformed backgrounds:', transformedData)
        setStyles(transformedData)
      } catch (error) {
        console.error('Error fetching backgrounds:', error)
        toast({
          title: "Error",
          description: "Failed to load background styles",
          variant: "destructive",
        })
      }
    }
    fetchStyles()
  }, [toast])

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-2 hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      <div className="grid grid-cols-4 gap-4 overflow-hidden">
        {styles.slice(startIndex, startIndex + itemsPerPage).map((style) => (
          <Card
            key={style.id}
            className={`relative aspect-square cursor-pointer transition-all ${
              selectedStyle?.id === style.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedStyle(style)}
          >
            <div className="relative w-full h-full">
              <Image
                src={style.image_url}
                alt={style.name}
                fill
                className="object-cover"
              />
              <Dialog>
                <DialogTrigger asChild>
                  <button className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
                    <Maximize2 className="h-4 w-4 text-white" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogTitle>{style.name}</DialogTitle>
                  <div className="relative w-full h-[600px]">
                    <Image
                      src={style.image_url}
                      alt={style.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-2 hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
