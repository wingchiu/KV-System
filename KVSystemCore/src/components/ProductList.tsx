'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Maximize2, Trash2, Pencil } from 'lucide-react'
import Image from 'next/image'
import { Product } from '@/lib/types'
import ProductForm from './ProductForm'
import { useState } from 'react'

interface ProductListProps {
  products: Product[]
  onDelete: (id: number) => Promise<void>
  onUpdate: (id: number, data: any) => Promise<void>
  type?: 'product' | 'white'
}

export default function ProductList({ products, onDelete, onUpdate, type = 'product' }: ProductListProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const handleUpdate = async (data: any) => {
    if (!editingProduct) return
    try {
      await onUpdate(editingProduct.id, data)
      setEditingProduct(null)
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {products.map((product) => (
        <Card key={product.id} className="p-4">
          <div className="flex items-start gap-4">
            <div className="relative w-40 h-40">
              <Image
                src={product.image_url}
                alt={product.name}
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
                    {product.name} Preview
                  </DialogTitle>
                  <div className="relative w-full aspect-[16/9]">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{product.description}</p>
              <p className="text-sm text-gray-500 mt-1">Category: {product.category}</p>
              <p className="text-sm text-gray-500 mt-1">Product Type: {product.product_type}</p>
              <p className="text-sm text-gray-500 mt-1">Lora Filename: {product.lora_path}</p>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingProduct(product)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onDelete(product.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {editingProduct?.id === product.id && (
            <Dialog open={true} onOpenChange={(open) => !open && setEditingProduct(null)}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogTitle>Edit Product</DialogTitle>
                <ProductForm
                  initialData={product}
                  onSubmit={handleUpdate}
                  loading={false}
                />
              </DialogContent>
            </Dialog>
          )}
        </Card>
      ))}
    </div>
  )
}