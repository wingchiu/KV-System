'use client'

import { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '@/lib/types';

interface ProductContextType {
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  whiteProducts: Product[];
  setWhiteProducts: (products: Product[]) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [whiteProducts, setWhiteProducts] = useState<Product[]>([]);

  return (
    <ProductContext.Provider value={{ selectedProduct, setSelectedProduct, whiteProducts, setWhiteProducts }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
}
