'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useProduct } from '@/lib/contexts/ProductContext'
import Image from 'next/image'
import { Maximize2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog'

export default function WhiteProductSelector() {
  const { toast } = useToast()
  const { selectedProduct, setSelectedProduct, whiteProducts, setWhiteProducts } = useProduct()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('Fetching white products...')
        const { data, error } = await supabase
          .from('white_products')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
        
        if (!data) {
          console.log('No data returned from white_products')
          return
        }
        
        console.log('White products data:', data)
        
        const transformedData = data.map(prod => ({
          id: prod.id,
          name: prod.name || 'Product',
          image_url: prod.image_url,
          category: prod.category || 'default',
          created_at: prod.created_at
        }))
        
        console.log('Transformed white products:', transformedData)
        setWhiteProducts(transformedData)
      } catch (error) {
        console.error('Error fetching white products:', error)
        toast({
          title: "Error",
          description: "Failed to load white products",
          variant: "destructive",
        })
      }
    }
    fetchProducts()
  }, [toast, setWhiteProducts])

  if (whiteProducts.length === 0) {
    return <div>Loading white products...</div>
  }

  const categories = Array.from(new Set(whiteProducts.map(p => p.category || 'default')))
  if (categories.length === 0) {
    categories.push('default')
  }

  return (
    <Tabs defaultValue={categories[0]} className="w-full">
      <TabsList className="mb-4">
        {categories.map((category) => (
          <TabsTrigger key={category} value={category} className="capitalize">
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((category) => (
        <TabsContent key={category} value={category}>
          <div className="grid grid-cols-4 gap-4">
            {whiteProducts
              .filter((product) => (product.category || 'default') === category)
              .map((product) => (
                <Card
                  key={product.id}
                  className={`relative aspect-square cursor-pointer transition-all ${
                    selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
                          <Maximize2 className="h-4 w-4 text-white" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogTitle>{product.name}</DialogTitle>
                        <div className="relative w-full h-[600px]">
                          <Image
                            src={product.image_url}
                            alt={product.name}
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
        </TabsContent>
      ))}
    </Tabs>
  )
}
