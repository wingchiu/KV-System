          'use client'

import { StyleProvider } from '@/lib/contexts/StyleContext'
import { ProductProvider } from '@/lib/contexts/ProductContext'
import BGStyleSelector from '@/components/BGStyleSelector'
import WhiteProductSelector from '@/components/WhiteProductSelector'
import PromptEditor from '@/components/PromptEditor'

export default function BGReplacementPage() {
  return (
    <StyleProvider>
      <ProductProvider>
        <div className="container mx-auto px-4 py-8 space-y-8">
          <h1 className="text-3xl font-bold">Background Replacement</h1>
          
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Select Background Style</h2>
            <BGStyleSelector />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Select White Product</h2>
            <WhiteProductSelector />
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
