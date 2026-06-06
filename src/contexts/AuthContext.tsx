import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (opts: {
    email: string
    password: string
    username: string
    displayName: string
    firstName: string
    lastName: string
    favoriteTeam: string
  }) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single()
    setProfile(data ?? null)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUp(opts: {
    email: string
    password: string
    username: string
    displayName: string
    firstName: string
    lastName: string
    favoriteTeam: string
  }): Promise<string | null> {
    // Auth sign-up — store name in metadata so it's always captured
    const authEmail = `${opts.username}@wc2026.internal`
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: opts.password,
      options: {
        data: {
          first_name: opts.firstName,
          last_name: opts.lastName,
          display_name: opts.displayName,
          real_email: opts.email,
        },
      },
    })
    if (error) return error.message
    if (!data.user) return 'Sign up failed — no user returned'

    // Try inserting with first_name/last_name columns; fall back without if they don't exist yet
    const base = {
      user_id: data.user.id,
      username: opts.username,
      display_name: opts.displayName,
      email: opts.email || null,
      favorite_team: opts.favoriteTeam,
    }
    let { error: profileError } = await supabase.from('users').insert({
      ...base,
      first_name: opts.firstName,
      last_name: opts.lastName,
    })
    if (profileError) {
      // Columns may not exist yet — retry without them
      if (profileError.message.includes('column') || profileError.code === '42703') {
        ;({ error: profileError } = await supabase.from('users').insert(base))
      }
      if (profileError) return profileError.message
    }

    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
