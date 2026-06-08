import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface GiphyGif {
  id: string
  images: {
    fixed_height_small: { url: string; width: string; height: string }
    original: { url: string }
  }
  title: string
}

interface Props {
  onSelect: (url: string) => void
  onClose: () => void
}

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined

export default function GifPicker({ onSelect, onClose }: Props) {
  const [query, setQuery]     = useState('')
  const [gifs, setGifs]       = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchGifs(q: string) {
    if (!API_KEY) return
    setLoading(true)
    const endpoint = q.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=g`
    try {
      const res  = await fetch(endpoint)
      const json = await res.json()
      setGifs(json.data ?? [])
    } catch {
      setGifs([])
    }
    setLoading(false)
  }

  // Load trending on mount
  useEffect(() => { fetchGifs('') }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(query), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  if (!API_KEY) {
    return (
      <div style={{
        borderTop: '1px solid #F1F5F9', background: '#FFFBEB',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ fontSize: 13, color: '#92400E' }}>
          Add <code style={{ background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>VITE_GIPHY_API_KEY</code> to your <code style={{ background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>.env.local</code> to enable GIF search.
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div style={{
      borderTop: '1px solid #F1F5F9', background: '#fff', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      height: 320,
    }}>
      {/* Search bar */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none',
          }} />
          <input
            autoFocus
            type="text"
            placeholder="Search GIFs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 30px',
              borderRadius: 10, border: '1px solid #E2E8F0',
              fontSize: 13, outline: 'none', background: '#F8FAFC',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#16A34A' }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0' }}
          />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>
          Powered by GIPHY
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* GIF grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="w-6 h-6 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gifs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', paddingTop: 40, fontSize: 13 }}>
            No GIFs found. Try a different search!
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
          }}>
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.original.url)}
                style={{
                  padding: 0, border: 'none', borderRadius: 8,
                  overflow: 'hidden', cursor: 'pointer',
                  background: '#F1F5F9',
                  aspectRatio: '1',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                }}
                title={gif.title}
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
