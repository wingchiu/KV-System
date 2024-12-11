'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (event === 'SIGNED_IN') router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const handleSignIn = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        console.error('Auth error:', error)
        throw error
      }

      if (!data.url) {
        throw new Error('No authentication URL returned')
      }

      // Redirect to the authentication URL
      window.location.href = data.url
    } catch (error) {
      console.error('Sign in error:', error)
      toast({
        title: "Authentication Error",
        description: "Unable to connect to authentication service. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return user ? (
    <Button 
      variant="outline" 
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </Button>
  ) : (
    <Button 
      variant="outline" 
      onClick={handleSignIn}
      disabled={loading}
    >
      {loading ? 'Signing in...' : 'Sign In with Google'}
    </Button>
  )
}