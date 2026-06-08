import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, ImageIcon, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import FlagImage from '../components/FlagImage'
import GifPicker from '../components/GifPicker'

interface UserInfo {
  display_name: string
  favorite_team: string | null
  username: string
}

interface ChatMsg {
  id: string
  user_id: string
  message: string | null
  image_url: string | null
  created_at: string
  display_name: string
  favorite_team: string | null
  username: string
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function toMsg(raw: Record<string, unknown>, map: Record<string, UserInfo>): ChatMsg {
  const info = map[raw.user_id as string]
  return {
    id:           raw.id as string,
    user_id:      raw.user_id as string,
    message:      raw.message as string | null,
    image_url:    raw.image_url as string | null,
    created_at:   raw.created_at as string,
    display_name: info?.display_name ?? 'Unknown',
    favorite_team: info?.favorite_team ?? null,
    username:     info?.username ?? '',
  }
}

export default function Chat() {
  const { user, profile } = useAuth()
  const [messages, setMessages]   = useState<ChatMsg[]>([])
  const [text, setText]           = useState('')
  const [imageUrl, setImageUrl]   = useState('')
  const [showImg, setShowImg]     = useState(false)
  const [showGif, setShowGif]     = useState(false)
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const usersMapRef               = useRef<Record<string, UserInfo>>({})
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, favorite_team, username')

      const map: Record<string, UserInfo> = {}
      for (const u of usersData ?? []) map[u.user_id] = u
      usersMapRef.current = map

      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(300)

      setMessages((data ?? []).map(m => toMsg(m as Record<string, unknown>, map)))
      setLoading(false)
      setTimeout(() => scrollToBottom(false), 60)
    }
    load()

    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const incoming = toMsg(payload.new as Record<string, unknown>, usersMapRef.current)
        setMessages(prev => {
          // Skip if already added optimistically (own messages)
          if (prev.some(m => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
        setTimeout(() => scrollToBottom(), 80)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, scrollToBottom])

  async function sendMsg(msgText: string | null, imgUrl: string | null) {
    if (!user || (!msgText?.trim() && !imgUrl)) return

    // Optimistic: add immediately so sender sees it right away
    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatMsg = {
      id:           optimisticId,
      user_id:      user.id,
      message:      msgText?.trim() || null,
      image_url:    imgUrl || null,
      created_at:   new Date().toISOString(),
      display_name: profile?.display_name ?? 'You',
      favorite_team: profile?.favorite_team ?? null,
      username:     profile?.username ?? '',
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(), 50)

    const { data } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, message: msgText?.trim() || null, image_url: imgUrl || null })
      .select()
      .single()

    if (data) {
      // Replace optimistic entry with real DB row (has the real id)
      const real = toMsg(data as Record<string, unknown>, usersMapRef.current)
      setMessages(prev => prev.map(m => m.id === optimisticId ? real : m))
    }
  }

  async function send() {
    if (sending) return
    setSending(true)
    await sendMsg(text, imageUrl || null)
    setText('')
    setImageUrl('')
    setShowImg(false)
    setSending(false)
    inputRef.current?.focus()
  }

  async function deleteMsg(id: string) {
    setMessages(prev => prev.filter(m => m.id !== id))
    await supabase.from('chat_messages').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 130px)',
      borderRadius: 20, overflow: 'hidden',
      border: '1px solid #E2E8F0',
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      background: '#fff',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 20px', flexShrink: 0,
        background: 'linear-gradient(135deg, #0F172A, #1E293B)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #16A34A, #15803D)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>⚽</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>NRG Match Chat</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {messages.length} messages · Share picks, reactions & memes!
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 2,
        background: '#F8FAFC',
      }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚽</div>
            <div style={{ fontWeight: 700, color: '#64748B', marginBottom: 4 }}>No messages yet</div>
            <div style={{ fontSize: 13 }}>Be the first to kick things off!</div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn    = msg.user_id === user?.id
          const prev     = messages[i - 1]
          const isNewDay = !prev || !isSameDay(prev.created_at, msg.created_at)
          const isNewGroup = !prev || prev.user_id !== msg.user_id || isNewDay
          const canDel   = isOwn || !!profile?.is_admin

          return (
            <div key={msg.id}>
              {/* ── Date separator ── */}
              {isNewDay && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '16px 0 12px',
                }}>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#94A3B8',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 999,
                    background: '#F1F5F9', border: '1px solid #E2E8F0',
                    whiteSpace: 'nowrap',
                  }}>
                    {fmtDateLabel(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                </div>
              )}

              {/* ── Message row ── */}
              <div style={{
                display: 'flex',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 8,
                marginTop: isNewGroup ? 10 : 3,
              }}>
                {/* Avatar (others only) */}
                {!isOwn && (
                  <div style={{ width: 32, flexShrink: 0, alignSelf: 'flex-end', paddingBottom: 2 }}>
                    {isNewGroup ? (
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: `hsl(${(msg.display_name.charCodeAt(0) * 37) % 360}, 55%, 45%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: '#fff',
                      }}>
                        {msg.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    ) : <div style={{ width: 32 }} />}
                  </div>
                )}

                <div style={{
                  maxWidth: '68%', display: 'flex', flexDirection: 'column',
                  gap: 2, alignItems: isOwn ? 'flex-end' : 'flex-start',
                }}>
                  {/* Sender name + flag + time — shown on first of each group */}
                  {isNewGroup && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginBottom: 3,
                      flexDirection: isOwn ? 'row-reverse' : 'row',
                      paddingLeft: isOwn ? 0 : 4,
                      paddingRight: isOwn ? 4 : 0,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isOwn ? '#16A34A' : '#475569' }}>
                        {isOwn ? 'You' : msg.display_name}
                      </span>
                      {msg.favorite_team && <FlagImage team={msg.favorite_team} size="sm" />}
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{fmtTime(msg.created_at)}</span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredId(msg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div style={{
                      padding: msg.image_url && !msg.message ? '4px' : '10px 14px',
                      borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isOwn ? 'linear-gradient(135deg, #16A34A, #15803D)' : '#fff',
                      color: isOwn ? '#fff' : '#0F172A',
                      fontSize: 14, lineHeight: 1.55,
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    }}>
                      {msg.message && <div>{msg.message}</div>}
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="shared"
                          style={{
                            maxWidth: 280, maxHeight: 300, borderRadius: 12,
                            display: 'block', marginTop: msg.message ? 8 : 0, cursor: 'pointer',
                          }}
                          onClick={() => window.open(msg.image_url!, '_blank')}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                    </div>

                    {/* Delete on hover */}
                    {canDel && hoveredId === msg.id && (
                      <button
                        onClick={() => deleteMsg(msg.id)}
                        style={{
                          position: 'absolute', top: -7,
                          [isOwn ? 'left' : 'right']: -7,
                          width: 20, height: 20, borderRadius: '50%',
                          border: 'none', background: '#EF4444', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: 14, fontWeight: 700,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                          padding: 0, lineHeight: 1,
                        }}
                      >×</button>
                    )}
                  </div>

                  {/* Timestamp — only on last of each group */}
                  {(!messages[i + 1] || messages[i + 1].user_id !== msg.user_id) && !isNewGroup && (
                    <div style={{ fontSize: 10, color: '#94A3B8', padding: '0 4px' }}>
                      {fmtTime(msg.created_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── GIF Picker ── */}
      {showGif && (
        <GifPicker
          onSelect={async url => {
            setShowGif(false)
            await sendMsg(null, url)
          }}
          onClose={() => setShowGif(false)}
        />
      )}

      {/* ── Image URL bar ── */}
      {showImg && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #F1F5F9', flexShrink: 0,
          background: '#F8FAFC', display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <ImageIcon size={15} style={{ color: '#3B82F6', flexShrink: 0 }} />
          <input
            type="url"
            placeholder="Paste image URL…"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 10,
              border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#fff',
            }}
          />
          {imageUrl && (
            <img src={imageUrl} alt="preview"
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <button onClick={() => { setShowImg(false); setImageUrl('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #E2E8F0', flexShrink: 0,
        background: '#fff', display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <button
          onClick={() => { setShowGif(v => !v); setShowImg(false) }}
          title="Search GIFs"
          style={{
            height: 38, padding: '0 10px', borderRadius: 10, flexShrink: 0,
            border: `1px solid ${showGif ? '#A5B4FC' : '#E2E8F0'}`,
            background: showGif ? '#EEF2FF' : '#F8FAFC',
            color: showGif ? '#6366F1' : '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
          }}
        >GIF</button>

        <button
          onClick={() => { setShowImg(v => !v); setShowGif(false) }}
          title="Share image URL"
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            border: `1px solid ${showImg ? '#93C5FD' : '#E2E8F0'}`,
            background: showImg ? '#EFF6FF' : '#F8FAFC',
            color: showImg ? '#3B82F6' : '#94A3B8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        ><ImageIcon size={16} /></button>

        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message… emoji welcome! 🔥⚽🏆"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 500))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            border: '1px solid #E2E8F0', fontSize: 14, outline: 'none',
            background: '#F8FAFC', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#16A34A' }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0' }}
        />

        <button
          onClick={send}
          disabled={sending || (!text.trim() && !imageUrl.trim())}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
            background: sending || (!text.trim() && !imageUrl.trim())
              ? '#E2E8F0' : 'linear-gradient(135deg, #16A34A, #15803D)',
            color: sending || (!text.trim() && !imageUrl.trim()) ? '#94A3B8' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: sending || (!text.trim() && !imageUrl.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            boxShadow: sending || (!text.trim() && !imageUrl.trim()) ? 'none' : '0 2px 10px rgba(22,163,74,0.35)',
          }}
        ><Send size={15} /></button>
      </div>
    </div>
  )
}
