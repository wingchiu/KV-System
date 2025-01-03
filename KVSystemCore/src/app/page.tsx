'use client'

import KVStyleSelector from '@/components/KVStyleSelector'
import ProductSelector from '@/components/ProductSelector'
import PromptEditor from '@/components/PromptEditor'
import { StyleProvider } from '@/lib/contexts/StyleContext'
import { ProductProvider } from '@/lib/contexts/ProductContext'

export default function Home() {
  return (
    <StyleProvider>
      <ProductProvider>
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">KV Generation</h1>
          
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Select KV Style</h2>
            <KVStyleSelector />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Select Product</h2>
            <ProductSelector />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Customize Generation</h2>
            <PromptEditor />
          </section>
        </div>
      </ProductProvider>
    </StyleProvider>
  )
}