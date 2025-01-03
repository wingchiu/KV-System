import { Heart, Download, Expand, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageGeneration } from '@/lib/types'
import { format } from 'date-fns'
import Image from 'next/image'
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface HistoryGridProps {
  images: ImageGeneration[]
  onToggleFavorite: (id: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

export default function HistoryGrid({ images, onToggleFavorite, onDownload, onDelete }: HistoryGridProps) {
  const [selectedImage, setSelectedImage] = useState<ImageGeneration | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const imagesPerPage = 12
  
  // First show favorites, then sort by generated_at
  const sortedImages = [...images].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime()
  })

  const totalPages = Math.ceil(sortedImages.length / imagesPerPage)
  const startIndex = (currentPage - 1) * imagesPerPage
  const currentImages = sortedImages.slice(startIndex, startIndex + imagesPerPage)

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(curr => curr + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(curr => curr - 1)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentImages.map((image) => (
          <div key={image.id} className="relative group bg-card rounded-lg overflow-hidden">
            <div className="aspect-square relative">
              {image.image_url && (
                <Image
                  src={image.image_url}
                  alt={image.prompt || 'Generated image'}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm line-clamp-2 mb-2">{image.prompt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleFavorite(image.id)
                        }}
                        className="h-8 w-8"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            image.favorite ? 'fill-red-500 text-red-500' : 'text-white'
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownload(image.id)
                        }}
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4 text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
                            try {
                              await onDelete(image.id)
                            } catch (error) {
                              console.error('Delete failed:', error)
                            }
                          }
                        }}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-white hover:text-red-500" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedImage(image)
                      }}
                      className="h-8 w-8"
                    >
                      <Expand className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{image.product || 'No product'}</span>
                  {image.lora_model && (
                    <span className="bg-black text-white text-xs px-1.5 py-0.5 rounded font-medium" title="LORA model used">
                      LORA
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[10px] leading-tight text-amber-500">{image.generated_at && format(new Date(image.generated_at), 'yyyy-MM-dd')}</span>
                  <span className="font-mono text-[10px] leading-tight text-amber-500">{image.generated_at && format(new Date(image.generated_at), 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="px-3"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="px-3"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-0">
            <div className="absolute right-4 top-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedImage(null)}
                className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
            <div className="flex flex-col h-full">
              <div className="relative h-[50vh] bg-black">
                <Image
                  src={selectedImage.image_url || ''}
                  alt={selectedImage.prompt || 'Generated image'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Prompt</h3>
                  <div className="h-24 overflow-y-auto rounded-md bg-muted p-3 text-sm">
                    {selectedImage.prompt}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {[
                    { label: 'Style', value: selectedImage.style },
                    { label: 'Product', value: selectedImage.product },
                    { label: 'Resolution', value: selectedImage.resolution },
                    { label: 'LoRA Model', value: selectedImage.lora_model },
                    { label: 'Seed', value: selectedImage.seed?.toString() },
                    { 
                      label: 'Generated', 
                      value: selectedImage.generated_at ? 
                        new Date(selectedImage.generated_at).toLocaleString() : 
                        undefined 
                    },
                    { label: 'Node ID', value: selectedImage.node_id },
                    { label: 'Filename', value: selectedImage.filename }
                  ].map(({ label, value }) => value && (
                    <div key={label} className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{label}</p>
                      <p className="text-sm break-words">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}