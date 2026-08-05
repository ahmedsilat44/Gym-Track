import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const demoUser = { id: 'demo-user', email: 'demo@spotter.local', user_metadata: { display_name: 'Athlete' } }
const demoMembership = { access_status: 'approved', is_admin: false }
const SESSION_HINT_COOKIE = 'spotter_session_active'
const LEGACY_SESSION_HINT_COOKIE = 'velocity_session_active'

const updateSessionHintCookie = (isSignedIn) => {
  if (typeof document === 'undefined') return
  const path = import.meta.env.BASE_URL || '/'
  const maxAge = isSignedIn ? 60 * 60 * 24 * 365 : 0
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${SESSION_HINT_COOKIE}=${isSignedIn ? '1' : ''}; Path=${path}; Max-Age=${maxAge}; SameSite=Strict${secure}`
  document.cookie = `${LEGACY_SESSION_HINT_COOKIE}=; Path=${path}; Max-Age=0; SameSite=Strict${secure}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(isSupabaseConfigured ? null : { user: demoUser })
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [membership, setMembership] = useState(isSupabaseConfigured ? null : demoMembership)
  const [membershipUserId, setMembershipUserId] = useState(isSupabaseConfigured ? null : demoUser.id)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [membershipError, setMembershipError] = useState('')
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const userId = session?.user?.id

  const refreshMembership = useCallback(async () => {
    if (!supabase) {
      setMembership(demoMembership)
      setMembershipUserId(demoUser.id)
      return demoMembership
    }
    if (!userId) {
      setMembership(null)
      setMembershipUserId(null)
      setMembershipError('')
      return null
    }

    setMembershipLoading(true)
    setMembershipError('')
    try {
      const { data, error } = await supabase.rpc('get_my_membership').maybeSingle()
      if (error) throw error
      const nextMembership = data || { access_status: 'pending', is_admin: false }
      setMembership(nextMembership)
      setMembershipUserId(userId)
      return nextMembership
    } catch (caught) {
      setMembership(null)
      setMembershipUserId(userId)
      setMembershipError(caught.message || 'Could not check account approval.')
      return null
    } finally {
      setMembershipLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        updateSessionHintCookie(Boolean(data.session))
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setSessionLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (!nextSession) {
        setMembership(null)
        setMembershipUserId(null)
        setMembershipError('')
        setIsPasswordRecovery(false)
      }
      setSession(nextSession)
      updateSessionHintCookie(Boolean(nextSession))
      setSessionLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !userId) return
    refreshMembership()
  }, [refreshMembership, userId])

  const currentMembership = membershipUserId === userId ? membership : null

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading: sessionLoading || membershipLoading || (Boolean(session) && membershipUserId !== userId && !membershipError),
    isDemo: !isSupabaseConfigured,
    membership: currentMembership,
    membershipError,
    accessStatus: currentMembership?.access_status || null,
    isApproved: currentMembership?.access_status === 'approved',
    isAdmin: currentMembership?.access_status === 'approved' && Boolean(currentMembership?.is_admin),
    isPasswordRecovery,
    refreshMembership,
    async listMembers() {
      if (!supabase) return []
      const { data, error } = await supabase.rpc('admin_list_members')
      if (error) throw error
      return data || []
    },
    async setMemberAccess(userId, status) {
      if (!supabase) return
      const { error } = await supabase.rpc('admin_set_member_access', {
        target_user_id: userId,
        new_status: status,
      })
      if (error) throw error
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email, password, displayName) {
      const emailRedirectTo = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo,
        },
      })
      if (error) throw error
    },
    async requestPasswordReset(email) {
      if (!supabase) throw new Error('Password reset requires Supabase cloud mode.')
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
    },
    async updatePassword(password) {
      if (!supabase) throw new Error('Password reset requires Supabase cloud mode.')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
    clearPasswordRecovery() {
      setIsPasswordRecovery(false)
    },
    async signOut() {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      setMembership(null)
      setMembershipUserId(null)
      setMembershipError('')
      setIsPasswordRecovery(false)
      updateSessionHintCookie(false)
    },
  }), [currentMembership, isPasswordRecovery, membershipError, membershipLoading, membershipUserId, refreshMembership, session, sessionLoading, userId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
