'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Product } from '@/lib/types'
import { useToast } from './ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useProduct } from '@/lib/contexts/ProductContext'

export default function ProductSelector() {
  const [products, setProducts] = useState<Record<string, Product[]>>({
    coffee: [],
    snacks: [],
    beverages: []
  })
  const { selectedProduct, setSelectedProduct } = useProduct()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error

        const categorized = (data || []).reduce((acc: Record<string, Product[]>, product) => {
          if (!acc[product.category]) {
            acc[product.category] = []
          }
          acc[product.category].push(product)
          return acc
        }, {
          coffee: [],
          snacks: [],
          beverages: []
        })

        setProducts(categorized)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        })
      }
    }

    fetchProducts()
  }, [toast])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
  }

  return (
    <Tabs defaultValue="coffee">
      <TabsList className="mb-4">
        <TabsTrigger value="coffee">Coffee</TabsTrigger>
        <TabsTrigger value="snacks">Snacks</TabsTrigger>
        <TabsTrigger value="beverages">Beverages</TabsTrigger>
      </TabsList>

      {Object.entries(products).map(([category, categoryProducts]) => (
        <TabsContent key={category} value={category} className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categoryProducts.map((product) => (
              <Card
                key={product.id}
                className={`p-2 cursor-pointer transition-all hover:ring-2 hover:ring-yellow-500
                  ${selectedProduct?.id === product.id ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => handleProductSelect(product)}
              >
                <div className="aspect-square relative mb-2 rounded-lg overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-sm font-medium text-center">{product.name}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}