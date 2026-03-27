'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const isSuperAdminShell = pathname?.startsWith('/super-admin') ?? false

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCustomer, setIsCustomer] = useState(false)

  useEffect(() => {
    let mounted = true

    const applySession = (session: { user: User } | null) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'owner'
        setIsAdmin(userRole === 'owner' || userRole === 'admin')
        setIsCustomer(userRole === 'customer')
      } else {
        setIsAdmin(false)
        setIsCustomer(false)
      }
    }

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        applySession(session)
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    /** On Super Admin routes, tenant auth uses a separate cookie; skip the global listener so console/state are not driven by the wrong session. */
    if (isSuperAdminShell) {
      return () => {
        mounted = false
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
        }
        return
      }

      applySession(session)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isSuperAdminShell])

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
