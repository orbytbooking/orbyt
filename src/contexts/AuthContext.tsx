'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isCustomer: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCustomer, setIsCustomer] = useState(false)

  useEffect(() => {
    let mounted = true
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        setUser(session?.user || null)
        
        if (session?.user) {
          const userRole = session.user.user_metadata?.role || 'owner'
          setIsAdmin(userRole === 'owner' || userRole === 'admin')
          setIsCustomer(userRole === 'customer')
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state changed:', event, session?.user?.email)
      
      // Prevent unnecessary re-renders for the same session
      if (session?.user?.id === user?.id && event === 'TOKEN_REFRESHED') {
        return
      }
      
      setUser(session?.user || null)
      
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'owner'
        setIsAdmin(userRole === 'owner' || userRole === 'admin')
        setIsCustomer(userRole === 'customer')
      } else {
        setIsAdmin(false)
        setIsCustomer(false)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      isCustomer,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
