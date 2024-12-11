'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Product } from '@/lib/types'
import { useToast } from './ui/use-toast'
import { supabase } from '@/lib/supabase'

export default function ProductSelector() {
  const [products, setProducts] = useState<Record<string, Product[]>>({
    coffee: [],
    snacks: [],
    beverages: []
  })
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error

        const categorized = (data || []).reduce((acc, product) => {
          if (!acc[product.category]) {
            acc[product.category] = []
          }
          acc[product.category].push(product)
          return acc
        }, {} as Record<string, Product[]>)
        
        setProducts(categorized)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        })
      }
    }
    fetchProducts()
  }, [toast])

  return (
    <Tabs defaultValue="coffee">
      <TabsList className="mb-4">
        <TabsTrigger value="coffee">Coffee</TabsTrigger>
        <TabsTrigger value="snacks">Snacks</TabsTrigger>
        <TabsTrigger value="beverages">Beverages</TabsTrigger>
      </TabsList>

      {Object.entries(products).map(([category, items]) => (
        <TabsContent key={category} value={category}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {items.map((product) => (
              <Card
                key={product.id}
                className={`p-2 cursor-pointer transition-all hover:ring-2 hover:ring-yellow-500
                  ${selectedProduct === product.id ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => setSelectedProduct(product.id)}
              >
                <div className="aspect-square relative mb-2 rounded-lg overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <p className="text-center font-medium">{product.name}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}