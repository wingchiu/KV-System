'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Wand2 } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'

interface BackgroundFormProps {
  onSubmit: (data: FormData) => Promise<void>
  loading: boolean
}

interface FormData {
  name: string
  prompt: string
  image: File | null
  imagePreview: string | null
}

export default function BackgroundForm({ onSubmit, loading }: BackgroundFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    prompt: '',
    image: null,
    imagePreview: null
  })
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const { toast } = useToast()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
        toast({
          title: "Invalid file type",
          description: "Only JPG and PNG files are allowed",
          variant: "destructive",
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const generateMagicPrompt = async () => {
    try {
      setGeneratingPrompt(true)
      
      if (!formData.image && !formData.imagePreview) {
        toast({
          title: "No Image Available",
          description: "Please select an image first",
          variant: "destructive",
        })
        return
      }

      let imageFile: File
      if (formData.image) {
        imageFile = formData.image
      } else {
        const response = await fetch(formData.imagePreview!)
        const blob = await response.blob()
        imageFile = new File([blob], 'background_image.jpg', { type: 'image/jpeg' })
      }

      const formDataApi = new FormData()
      formDataApi.append('image', imageFile)

      const response = await fetch('/api/vlm/generate_prompt', {
        method: 'POST',
        body: formDataApi
      })

      if (!response.ok) {
        throw new Error(`Failed to connect to VLM service: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success || !data.prompt) {
        throw new Error(data.error || 'Failed to generate prompt')
      }

      const promptText = String(data.prompt)
      const cleanPrompt = promptText.replace(/^\[(.*)\]$/, '$1').trim()
      
      setFormData(prev => ({
        ...prev,
        prompt: cleanPrompt
      }))

      toast({
        title: "Success",
        description: "Magic prompt generated successfully",
      })
    } catch (error) {
      console.error('Error generating prompt:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate prompt",
        variant: "destructive",
      })
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with data:', {
      name: formData.name,
      prompt: formData.prompt,
      hasImage: !!formData.image,
      imageName: formData.image?.name
    });

    if (!formData.image) {
      toast({
        title: "Missing Image",
        description: "Please select an image",
        variant: "destructive",
      })
      return
    }

    try {
      const submitData = {
        name: formData.name,
        prompt: formData.prompt,
        image: formData.image
      }

      await onSubmit(submitData)
      
      // Only reset form if submission was successful
      setFormData({
        name: '',
        prompt: '',
        image: null,
        imagePreview: null
      })
    } catch (error) {
      console.error('Error submitting form:', error)
      // Don't reset form data on error so user can try again
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Background Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <Textarea
          placeholder="Prompt"
          value={formData.prompt}
          onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
          className="h-20"
        />
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            required={!formData.image}
          />
        </div>
        {formData.imagePreview && (
          <div className="relative w-full aspect-video">
            <Image
              src={formData.imagePreview}
              alt="Preview"
              className="object-contain rounded-lg"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={generateMagicPrompt}
          disabled={generatingPrompt || !formData.image}
        >
          {generatingPrompt ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Magic Prompt by VLM
            </>
          )}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Background
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
