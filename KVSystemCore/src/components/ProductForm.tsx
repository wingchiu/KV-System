'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus } from 'lucide-react'
import Image from 'next/image'
import { Product } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'

interface ProductFormProps {
  initialData?: Product
  onSubmit: (data: FormData) => Promise<void>
  loading: boolean
  type?: 'product' | 'white'
}

interface FormData {
  name: string
  description: string
  category: 'coffee' | 'snacks' | 'beverages'
  product_type: string
  lora_path: string
  image: File | null
  imagePreview: string | null
}

export default function ProductForm({ initialData, onSubmit, loading, type = 'product' }: ProductFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'coffee',
    product_type: initialData?.product_type || '',
    lora_path: initialData?.lora_path || '',
    image: null,
    imagePreview: initialData?.image_url || null
  })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.description || !formData.product_type || (type === 'product' && !formData.lora_path)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (!initialData && !formData.image) {
      toast({
        title: "Validation Error",
        description: "Please select an image",
        variant: "destructive",
      })
      return
    }

    try {
      await onSubmit(formData)
      // Reset form after successful submission if it's not editing mode
      if (!initialData) {
        setFormData({
          name: '',
          description: '',
          category: 'coffee',
          product_type: '',
          lora_path: '',
          image: null,
          imagePreview: null
        })
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder={`${type === 'product' ? 'Product' : 'White Product'} Name`}
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      <Textarea
        placeholder="Product Description"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        className="h-20"
      />
      <Input
        placeholder="Product Type"
        value={formData.product_type}
        onChange={(e) => setFormData(prev => ({ ...prev, product_type: e.target.value }))}
      />
      {type === 'product' && (
        <Input
          placeholder="Lora Filename"
          value={formData.lora_path}
          onChange={(e) => setFormData(prev => ({ ...prev, lora_path: e.target.value }))}
        />
      )}
      <select
        className="w-full p-2 border rounded-md"
        value={formData.category}
        onChange={(e) => setFormData(prev => ({ 
          ...prev, 
          category: e.target.value as 'coffee' | 'snacks' | 'beverages' 
        }))}
      >
        <option value="coffee">Coffee</option>
        <option value="snacks">Snacks</option>
        <option value="beverages">Beverages</option>
      </select>
      <div className="space-y-2">
        <Input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleImageChange}
        />
        {formData.imagePreview && (
          <div className="relative w-40 h-40">
            <Image
              src={formData.imagePreview}
              alt="Preview"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        )}
      </div>
      <Button 
        type="submit" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {initialData ? 'Updating...' : 'Adding...'}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            {initialData ? 'Update Product' : `Add ${type === 'product' ? 'Product' : 'White Product'}`}
          </>
        )}
      </Button>
    </form>
  )
}