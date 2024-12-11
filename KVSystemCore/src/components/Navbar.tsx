'use client'

import Link from 'next/link'
import { Search, Home, Settings, History } from 'lucide-react'
import { Input } from './ui/input'
import Image from 'next/image'

export default function Navbar() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image 
            src="/logo.svg" 
            alt="Publicis KV" 
            width={32} 
            height={32}
            priority
          />
          <span className="font-semibold text-xl">Publicis KV</span>
        </div>
        
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link 
            href="/"
            className="flex flex-col items-center gap-1 text-sm font-medium transition-colors hover:text-amber-500 group"
          >
            <Home className="h-5 w-5 group-hover:text-amber-500" />
            <span>KV Generation</span>
          </Link>
          <Link 
            href="/setup"
            className="flex flex-col items-center gap-1 text-sm font-medium transition-colors hover:text-amber-500 group"
          >
            <Settings className="h-5 w-5 group-hover:text-amber-500" />
            <span>Setup</span>
          </Link>
          <Link 
            href="/history"
            className="flex flex-col items-center gap-1 text-sm font-medium transition-colors hover:text-amber-500 group"
          >
            <History className="h-5 w-5 group-hover:text-amber-500" />
            <span>History</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}