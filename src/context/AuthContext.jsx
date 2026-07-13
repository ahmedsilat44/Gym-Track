import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const demoUser = { id: 'demo-user', email: 'demo@velocity.local', user_metadata: { display_name: 'Athlete' } }
const SESSION_HINT_COOKIE = 'velocity_session_active'

const updateSessionHintCookie = (isSignedIn) => {
  if (typeof document === 'undefined') return
  const path = import.meta.env.BASE_URL || '/'
  const maxAge = isSignedIn ? 60 * 60 * 24 * 365 : 0
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${SESSION_HINT_COOKIE}=${isSignedIn ? '1' : ''}; Path=${path}; Max-Age=${maxAge}; SameSite=Strict${secure}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(isSupabaseConfigured ? null : { user: demoUser })
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      updateSessionHintCookie(Boolean(data.session))
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      updateSessionHintCookie(Boolean(nextSession))
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    isDemo: !isSupabaseConfigured,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email, password, displayName) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (error) throw error
    },
    async signOut() {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      updateSessionHintCookie(false)
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
