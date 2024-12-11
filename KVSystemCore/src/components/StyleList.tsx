'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Maximize2, Trash2, Wand2, Loader2, Pencil } from 'lucide-react'
import Image from 'next/image'
import { KVStyle } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface StyleListProps {
  styles: KVStyle[]
  onDelete: (id: number) => void
  onMagicPrompt: (id: number) => Promise<void>
  vlmLoading: boolean
  onUpdatePrompt: (id: number, prompt: string) => Promise<void>
}

export default function StyleList({ styles, onDelete, onMagicPrompt, vlmLoading, onUpdatePrompt }: StyleListProps) {
  const { toast } = useToast()
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null)
  const [editingStyle, setEditingStyle] = useState<{ id: number; prompt: string } | null>(null)
  const [editPrompt, setEditPrompt] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  const handleMagicPrompt = async (styleId: number) => {
    setSelectedStyleId(styleId)
    try {
      await onMagicPrompt(styleId)
    } finally {
      setSelectedStyleId(null)
    }
  }

  const handleEditClick = (style: KVStyle) => {
    setEditingStyle({ id: style.id, prompt: style.prompt })
    setEditPrompt(style.prompt)
    setIsEditing(true)
  }

  const handleSavePrompt = async () => {
    if (!editingStyle) return

    try {
      await onUpdatePrompt(editingStyle.id, editPrompt)
      setIsEditing(false)
      setEditingStyle(null)
      toast({
        title: "Success",
        description: "Prompt updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prompt",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <div className="grid gap-4">
        {styles.map((style) => (
          <Card key={style.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="relative w-40 h-40">
                <Image
                  src={style.image_url}
                  alt={style.name}
                  fill
                  className="object-cover rounded-lg"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <button 
                      className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 hover:bg-white rounded-md transition-colors"
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
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{style.name}</h3>
                <div className="flex items-start gap-2 mt-2">
                  <p className="text-sm text-gray-600 flex-1">{style.prompt}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleEditClick(style)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => onDelete(style.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    className="bg-sky-500 hover:bg-sky-600 text-white"
                    onClick={() => handleMagicPrompt(style.id)}
                    disabled={vlmLoading && selectedStyleId === style.id}
                  >
                    {vlmLoading && selectedStyleId === style.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Magic Prompt by VLM
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl w-[800px]">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Enter prompt..."
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}