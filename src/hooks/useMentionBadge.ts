import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const LS_KEY = 'nrg_chat_last_seen'

export function useMentionBadge() {
  const { user, profile } = useAuth()
  const [count, setCount] = useState(0)

  const markRead = useCallback(() => {
    localStorage.setItem(LS_KEY, new Date().toISOString())
    setCount(0)
  }, [])

  useEffect(() => {
    if (!user || !profile?.username) return

    const username  = profile.username
    const lastSeen  = localStorage.getItem(LS_KEY) ?? new Date(0).toISOString()

    // Count existing unread mentions since last visit
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .ilike('message', `%@${username}%`)
      .gt('created_at', lastSeen)
      .neq('user_id', user.id)
      .then(({ count: c }) => setCount(c ?? 0))

    // Increment on new incoming mentions
    const channel = supabase
      .channel(`mention_badge_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const msg = payload.new as { message: string | null; user_id: string }
        if (msg.user_id !== user.id && msg.message?.includes(`@${username}`)) {
          setCount(c => c + 1)
        }
      })
      .subscribe()

    // Reset badge when user navigates to /chat
    const onChatOpened = () => markRead()
    window.addEventListener('chat_opened', onChatOpened)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('chat_opened', onChatOpened)
    }
  }, [user, profile?.username, markRead])

  return { count, markRead }
}
