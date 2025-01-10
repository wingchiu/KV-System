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
import { Button } from '@/components/ui/button'
import { Loader2, Wand2 } from 'lucide-react'
import Image from 'next/image'

export default function SetupPage() {
  const [styles, setStyles] = useState<KVStyle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [backgrounds, setBackgrounds] = useState<any[]>([])
  const [whiteProducts, setWhiteProducts] = useState<any[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [vlmLoading, setVlmLoading] = useState(false)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('styles')

  useEffect(() => {
    fetchStyles()
    fetchProducts()
    fetchBackgrounds()
    fetchWhiteProducts()
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

  const fetchBackgrounds = async () => {
    try {
      const { data, error } = await supabase
        .from('backgrounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackgrounds(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load Backgrounds",
        variant: "destructive",
      });
    }
  };

  const fetchWhiteProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('white_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWhiteProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load White Products",
        variant: "destructive",
      });
    }
  };

  const handleStyleAdd: (formData: any) => Promise<any> = async (formData: any) => {
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

  const handleDelete = async (id: number, type: 'style' | 'product' | 'background' | 'white_product') => {
    try {
      if (type === 'style') {
        const { error } = await supabase
          .from('kv_styles')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchStyles()
      } else if (type === 'product') {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchProducts()
      } else if (type === 'background') {
        const { error } = await supabase
          .from('backgrounds')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchBackgrounds()
      } else {
        const { error } = await supabase
          .from('white_products')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchWhiteProducts()
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
          const errorMessage = data.error || data.steps?.find((step: any) => !step.success)?.error || 'Failed to generate prompt'
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
      } catch (error: any) {
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

  const handleBackgroundAdd = async (formData: any) => {
    try {
      setAddLoading(true);
      console.log('Starting background add with formData:', { 
        name: formData.name, 
        prompt: formData.prompt,
        imageFile: formData.image?.name 
      });

      if (!formData.image) {
        throw new Error('Please select an image');
      }

      // Handle file upload first
      const filename = `${Date.now()}-${sanitizeFilename(formData.image.name)}`;
      console.log('Uploading file:', filename);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filename, formData.image);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('File uploaded successfully:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filename);
      
      console.log('Generated public URL:', publicUrl);

      // Insert the record with the image URL
      const { data, error } = await supabase
        .from('backgrounds')
        .insert([{
          name: formData.name,
          prompt: formData.prompt,
          image_url: publicUrl
        }])
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      console.log('Background added successfully:', data);

      await fetchBackgrounds();
      toast({ 
        title: "Success", 
        description: "Background added successfully" 
      });
      return true; // Return true to indicate success
    } catch (error) {
      console.error('Error adding background:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add background",
        variant: "destructive",
      });
      throw error; // Re-throw the error to be caught by the form
    } finally {
      setAddLoading(false);
    }
  };

  const handleWhiteProductAdd = async (formData: any) => {
    try {
      setAddLoading(true);
      console.log('Starting white product add with formData:', { 
        name: formData.name, 
        description: formData.description,
        imageFile: formData.image?.name 
      });

      if (!formData.image) {
        throw new Error('Please select an image');
      }

      // Handle file upload
      const filename = `${Date.now()}-${sanitizeFilename(formData.image.name)}`;
      console.log('Uploading file:', filename);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whitebg_product')
        .upload(filename, formData.image);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('File uploaded successfully:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('whitebg_product')
        .getPublicUrl(filename);
      
      console.log('Generated public URL:', publicUrl);

      // Insert the record with the image URL
      const { data, error } = await supabase
        .from('white_products')
        .insert([{
          name: formData.name,
          description: formData.description,
          image_url: publicUrl
        }])
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      console.log('White product added successfully:', data);

      await fetchWhiteProducts();
      toast({ 
        title: "Success", 
        description: "White product added successfully" 
      });
    } catch (error) {
      console.error('Error adding white product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add white product",
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Setup</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 tabs-list">
          <TabsTrigger value="styles" className="tabs-trigger">KV Styles</TabsTrigger>
          <TabsTrigger value="products" className="tabs-trigger">Product Lora</TabsTrigger>
          <TabsTrigger value="backgrounds" className="tabs-trigger">Backgrounds</TabsTrigger>
          <TabsTrigger value="whiteProducts" className="tabs-trigger">White Products</TabsTrigger>
        </TabsList>

        <TabsContent value="styles" className={`space-y-4 tabs-content ${activeTab === 'styles' ? 'active' : ''}`}>
          <Card className="p-4 card">
            <h2 className="text-lg font-semibold mb-4">Add New Style</h2>
            <StyleForm onSubmit={handleStyleAdd} loading={addLoading} />
          </Card>
          <StyleList styles={styles} onDelete={(id) => handleDelete(id, 'style')} onMagicPrompt={handleMagicPrompt} vlmLoading={vlmLoading} onUpdatePrompt={handlePromptUpdate} />
        </TabsContent>

        <TabsContent value="products" className={`space-y-4 tabs-content ${activeTab === 'products' ? 'active' : ''}`}>
          <Card className="p-4 card">
            <h2 className="text-lg font-semibold mb-4">Add New Product</h2>
            <ProductForm onSubmit={handleProductAdd} loading={addLoading} />
          </Card>
          <ProductList products={products} onDelete={(id) => handleDelete(id, 'product')} onUpdate={handleProductUpdate} />
        </TabsContent>

        <TabsContent value="backgrounds" className={`space-y-4 tabs-content ${activeTab === 'backgrounds' ? 'active' : ''}`}>
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Add New Background</h2>
            <StyleForm onSubmit={handleBackgroundAdd} loading={addLoading} type="background" />
          </Card>
          <StyleList 
            styles={backgrounds} 
            onDelete={(id) => handleDelete(id, 'background')} 
            onMagicPrompt={handleMagicPrompt}
            onUpdatePrompt={handlePromptUpdate}
            vlmLoading={vlmLoading} 
          />
        </TabsContent>

        <TabsContent value="whiteProducts" className={`space-y-4 tabs-content ${activeTab === 'whiteProducts' ? 'active' : ''}`}>
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Add New White Product</h2>
            <ProductForm onSubmit={handleWhiteProductAdd} loading={addLoading} type="white" />
          </Card>
          <ProductList 
            products={whiteProducts} 
            onDelete={(id) => handleDelete(id, 'white_product')} 
            type="white"
          />
        </TabsContent>
      </Tabs>
      <style>
        {`
          .tabs-content {
            display: none;
          }

          .tabs-content.active {
            display: block;
          }

          .tabs-list {
            display: flex;
            justify-content: space-around;
            border-bottom: 1px solid #e5e7eb;
          }

          .tabs-trigger {
            cursor: pointer;
            padding: 10px 20px;
            margin-bottom: -1px;
            border: 1px solid transparent;
          }

          .tabs-trigger.active {
            border-color: #e5e7eb #e5e7eb white;
            background-color: white;
          }

          .card {
            margin-top: 20px;
          }
        `}
      </style>
    </div>
  )
}