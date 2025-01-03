'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KVStyle, Product } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { sanitizeFilename } from '@/lib/utils'
import ProductForm from '@/components/ProductForm'
import ProductList from '@/components/ProductList'
import StyleForm from '@/components/StyleForm'
import StyleList from '@/components/StyleList'

export default function SetupPage() {
  const [styles, setStyles] = useState<KVStyle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [vlmLoading, setVlmLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchStyles()
    fetchProducts()
  }, [])

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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    }
  }

  const handleStyleAdd = async (formData: any) => {
    try {
      setAddLoading(true)

      const filename = `${Date.now()}-${sanitizeFilename(formData.image.name)}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('styles')
        .upload(filename, formData.image)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('styles')
        .getPublicUrl(filename)

      const { data, error } = await supabase
        .from('kv_styles')
        .insert([{
          name: formData.name,
          prompt: formData.prompt,
          image_url: publicUrl
        }])
        .select()
        .single()

      if (error) throw error

      await fetchStyles()
      toast({ 
        title: "Success", 
        description: "Style added successfully" 
      })
      return true // Return true to indicate success
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add style",
        variant: "destructive",
      })
      throw error // Re-throw the error to be caught by the form
    } finally {
      setAddLoading(false)
    }
  }

  const handleProductAdd = async (formData: any) => {
    try {
      setAddLoading(true)

      const filename = `${Date.now()}-${sanitizeFilename(formData.image.name)}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filename, formData.image)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filename)

      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          description: formData.description,
          category: formData.category,
          product_type: formData.product_type,
          lora_path: formData.lora_path,
          image_url: publicUrl
        }])
        .select()
        .single()

      if (error) throw error

      fetchProducts()
      toast({ title: "Success", description: "Product added successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add product",
        variant: "destructive",
      })
    } finally {
      setAddLoading(false)
    }
  }

  const handleProductUpdate = async (id: number, formData: any) => {
    try {
      setAddLoading(true)
      let updates: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        product_type: formData.product_type,
        lora_path: formData.lora_path,
      }

      if (formData.image) {
        const filename = `${Date.now()}-${sanitizeFilename(formData.image.name)}`
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filename, formData.image)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filename)

        updates.image_url = publicUrl
      }

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchProducts()
      toast({ title: "Success", description: "Product updated successfully" })
    } catch (error) {
      console.error('Update error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update product",
        variant: "destructive",
      })
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async (id: number, type: 'style' | 'product') => {
    try {
      if (type === 'style') {
        const { error } = await supabase
          .from('kv_styles')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchStyles()
      } else {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchProducts()
      }
      toast({ title: "Success", description: `${type} deleted successfully` })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${type}`,
        variant: "destructive",
      })
    }
  }

  const handleMagicPrompt = async (id: number) => {
    try {
      setVlmLoading(true)
      toast({
        title: "Processing",
        description: "Generating magic prompt...",
      })
      
      // Find the style
      const style = styles.find(s => s.id === id)
      if (!style) {
        throw new Error('Style not found')
      }

      // Create form data
      const formData = new FormData()
      
      // Fetch the image
      console.log('Fetching image from URL:', style.image_url);
      const imageResponse = await fetch(style.image_url)
      const blob = await imageResponse.blob()
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
      formData.append('image', file)

      // Make the API call with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      try {
        console.log('Sending request to VLM service...');
        const response = await fetch('/api/vlm/generate_prompt', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        })

        clearTimeout(timeoutId)

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

        const data = await response.json()
        console.log('VLM service response:', data)

        if (!data.success) {
          // If there's a specific step error, show it, otherwise show the general error
          const errorMessage = data.error || data.steps?.find(step => !step.success)?.error || 'Failed to generate prompt'
          console.error('VLM service process failed:', errorMessage);
          throw new Error(errorMessage)
        }

        if (!data.prompt) {
          throw new Error('No prompt received from the service')
        }

        console.log('Updating style with new prompt:', data.prompt);
        // Ensure prompt is a string and clean it
        const promptText = String(data.prompt);
        const cleanPrompt = promptText.replace(/^\[(.*)\]$/, '$1').trim();
        
        // Update the style with new prompt
        const { error: updateError } = await supabase
          .from('kv_styles')
          .update({ prompt: cleanPrompt })
          .eq('id', id)

        if (updateError) {
          console.error('Supabase update error:', updateError);
          throw updateError;
        }

        await fetchStyles()
        toast({
          title: "Success",
          description: "Style prompt updated successfully",
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 60 seconds')
        }
        throw error
      }
    } catch (error) {
      console.error('Error details:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      })
    } finally {
      setVlmLoading(false)
    }
  }

  const handlePromptUpdate = async (id: number, prompt: string) => {
    try {
      const { error } = await supabase
        .from('kv_styles')
        .update({ prompt })
        .eq('id', id)

      if (error) throw error

      await fetchStyles()
    } catch (error) {
      console.error('Error updating prompt:', error)
      throw error
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Setup</h1>

      <Tabs defaultValue="styles">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="styles">KV Styles</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        
        <TabsContent value="styles" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Add New Style</h2>
            <StyleForm onSubmit={handleStyleAdd} loading={addLoading} />
          </Card>

          <StyleList 
            styles={styles} 
            onDelete={handleDelete} 
            onMagicPrompt={handleMagicPrompt}
            vlmLoading={vlmLoading}
            onUpdatePrompt={handlePromptUpdate}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Add New Product</h2>
            <ProductForm onSubmit={handleProductAdd} loading={addLoading} />
          </Card>

          <ProductList 
            products={products}
            onDelete={(id) => handleDelete(id, 'product')}
            onUpdate={handleProductUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}