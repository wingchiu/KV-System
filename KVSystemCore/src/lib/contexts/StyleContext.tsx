'use client'

import { createContext, useContext, useState } from 'react'
import { KVStyle } from '@/lib/types'

type StyleContextType = {
  selectedStyle: KVStyle | null
  setSelectedStyle: (style: KVStyle | null) => void
}

const StyleContext = createContext<StyleContextType | undefined>(undefined)

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [selectedStyle, setSelectedStyle] = useState<KVStyle | null>(null)

  return (
    <StyleContext.Provider value={{ selectedStyle, setSelectedStyle }}>
      {children}
    </StyleContext.Provider>
  )
}

export function useStyle() {
  const context = useContext(StyleContext)
  if (context === undefined) {
    throw new Error('useStyle must be used within a StyleProvider')
  }
  return context
}