'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'
import HistoryGrid from '@/components/history/HistoryGrid'
import { ImageGeneration } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'

export default function HistoryPage() {
  const [images, setImages] = useState<ImageGeneration[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('image_generations')
        .select('*')
        .order('generated_at', { ascending: false })

      if (error) {
        throw error
      }

      setImages(data || [])
    } catch (error) {
      console.error('Error fetching images:', error)
      toast({
        title: "Error",
        description: "Failed to load generated images",
        variant: "destructive",
      })
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      const image = images.find(img => img.id === id)
      if (!image) return

      const { error } = await supabase
        .from('image_generations')
        .update({ favorite: !image.favorite })
        .eq('id', id)

      if (error) throw error

      setImages(prevImages =>
        prevImages.map(img =>
          img.id === id ? { ...img, favorite: !img.favorite } : img
        )
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      })
    }
  }

  const handleDownload = (id: string) => {
    const image = images.find(img => img.id === id)
    if (!image?.image_url) return

    const link = document.createElement('a')
    link.href = image.image_url
    link.download = image.filename || `generated-${id}.jpg`
    link.click()
  }

  const handleDelete = async (id: string) => {
    if (isDeleting) return
    
    try {
      setIsDeleting(true)
      console.log('Starting delete for image:', id)

      // Get the image details first
      const { data: image, error: fetchError } = await supabase
        .from('image_generations')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching image:', fetchError)
        throw fetchError
      }

      console.log('Found image:', image)

      // Delete from the database first
      const { error: deleteError } = await supabase
        .from('image_generations')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting from database:', deleteError)
        throw deleteError
      }

      console.log('Successfully deleted from database')

      // Update the UI
      setImages(prevImages => prevImages.filter(img => img.id !== id))
      
      toast({
        title: "Success",
        description: "Image deleted successfully",
      })

    } catch (error) {
      console.error('Error in delete process:', error)
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Generation History</h1>
      <HistoryGrid 
        images={images}
        onToggleFavorite={handleToggleFavorite}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </div>
  )
}