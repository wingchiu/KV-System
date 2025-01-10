'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Wand2 } from 'lucide-react'
import Image from 'next/image'
import { KVStyle } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'

interface StyleFormProps {
  initialData?: KVStyle
  onSubmit: (data: FormData) => Promise<void>
  loading: boolean
  type?: 'style' | 'background'
}

interface FormData {
  name: string
  prompt: string
  image: File | null
  imagePreview: string | null
}

export default function StyleForm({ initialData, onSubmit, loading, type = 'style' }: StyleFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    prompt: initialData?.prompt || '',
    image: null,
    imagePreview: initialData?.image_url || null
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
      
      // Get the image, either from file upload or existing URL
      let imageFile: File;
      
      if (formData.image) {
        // If there's a new uploaded file, use it directly
        imageFile = formData.image;
      } else if (formData.imagePreview) {
        // If using existing style image, fetch it and convert to File
        const response = await fetch(formData.imagePreview);
        const blob = await response.blob();
        imageFile = new File([blob], 'style_image.jpg', { type: 'image/jpeg' });
      } else {
        toast({
          title: "No Image Available",
          description: "Please select an image first",
          variant: "destructive",
        });
        return;
      }

      const formDataApi = new FormData();
      formDataApi.append('image', imageFile);

      console.log('Sending request to VLM service...');
      const response = await fetch('/api/vlm/generate_prompt', {
        method: 'POST',
        body: formDataApi
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('VLM service error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to connect to VLM service: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('VLM service response:', data);
      
      if (!data.success) {
        const errorMessage = data.error || data.steps?.find((step: any) => !step.success)?.error || 'Failed to generate prompt';
        console.error('VLM service process failed:', errorMessage);
        throw new Error(errorMessage);
      }

      if (data.prompt) {
        console.log('Setting new prompt:', data.prompt);
        const promptText = String(data.prompt);
        const cleanPrompt = promptText.replace(/^\[(.*)\]$/, '$1').trim();
        setFormData(prev => ({ ...prev, prompt: cleanPrompt }));
        toast({
          title: "Success",
          description: "Magic prompt generated successfully",
        });
      } else {
        throw new Error('No prompt received from the service');
      }
    } catch (error) {
      console.error('Error details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate magic prompt",
        variant: "destructive",
      });
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.prompt) {
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
          prompt: '',
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
        placeholder={`${type === 'style' ? 'Style' : 'Background'} Name`}
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
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="secondary"
          onClick={generateMagicPrompt}
          disabled={generatingPrompt || !formData.imagePreview}
          className="bg-sky-500 hover:bg-sky-600 text-white"
        >
          {generatingPrompt ? (
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
        <Button 
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add {type === 'style' ? 'Style' : 'Background'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}