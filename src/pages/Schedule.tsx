import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Match, Prediction, MatchResult } from '../types'
import MatchCard from '../components/MatchCard'
import PlayerCarousel from '../components/PlayerCarousel'
import { isLocked } from '../lib/utils'

type Filter = 'all' | 'upcoming' | 'locked' | 'predicted' | 'unpredicted'

export default function Schedule() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [results, setResults] = useState<Record<number, MatchResult>>({})
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [matchRes, predRes, resultRes] = await Promise.all([
        supabase.from('worldcup_schedule').select('*').order('DateTime_CST', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
        supabase.from('match_results').select('*'),
      ])
      const all = matchRes.data ?? []
      setMatches(all)

      const predMap: Record<number, Prediction> = {}
      for (const p of predRes.data ?? []) predMap[p.match_no] = p

      // Auto-default: locked matches with no prediction → insert even split (scores as 0)
      const lockedNoPred = all.filter(m => m.DateTime_CST && isLocked(m.DateTime_CST) && !predMap[m.MatchNo])
      if (lockedNoPred.length > 0) {
        const { data: inserted } = await supabase.from('predictions').insert(
          lockedNoPred.map(m => ({
            user_id: user!.id,
            match_no: m.MatchNo,
            t1_win_prob: 0.34,
            draw_prob: 0.33,
            t2_win_prob: 0.33,
          }))
        ).select()
        for (const p of inserted ?? []) predMap[p.match_no] = p
      }

      setPredictions(predMap)

      const resMap: Record<number, MatchResult> = {}
      for (const r of resultRes.data ?? []) resMap[r.match_no] = r
      setResults(resMap)

      setLoading(false)
    }
    load()
  }, [user])

  const filtered = matches.filter(m => {
    const locked = m.DateTime_CST ? isLocked(m.DateTime_CST) : false
    const hasPred = !!predictions[m.MatchNo]

    if (filter === 'upcoming' && locked) return false
    if (filter === 'locked' && !locked) return false
    if (filter === 'predicted' && !hasPred) return false
    if (filter === 'unpredicted' && (hasPred || locked)) return false

    if (search) {
      const q = search.toLowerCase()
      return (
        m.TeamA?.toLowerCase().includes(q) ||
        m.TeamB?.toLowerCase().includes(q) ||
        m.Stage?.toLowerCase().includes(q) ||
        m.Venue?.toLowerCase().includes(q) ||
        false
      )
    }
    return true
  })

  // Past-facing filters: show newest first so latest results are at top
  const displayMatches = (filter === 'locked' || filter === 'predicted')
    ? [...filtered].reverse()
    : filtered

  const filterDefs: { key: Filter; label: string }[] = [
    { key: 'upcoming',    label: 'Upcoming' },
    { key: 'unpredicted', label: 'Need Prediction' },
    { key: 'predicted',   label: 'Predicted' },
    { key: 'locked',      label: 'Past' },
    { key: 'all',         label: 'All' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Match Schedule</h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>{matches.length} matches total</p>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none',
          }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search teams, stage, venue…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterDefs.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={filter === f.key ? 'btn-primary text-xs px-3 py-1.5' : 'btn-secondary text-xs px-3 py-1.5'}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {displayMatches.length === 0 ? (
        <p style={{ color: '#94A3B8', fontSize: 14 }}>No matches found.</p>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Single-column match list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              {displayMatches.map(m => (
                <MatchCard key={m.MatchNo} match={m}
                  prediction={predictions[m.MatchNo]} result={results[m.MatchNo]} />
              ))}
            </div>
          </div>

          {/* Sticky player carousel — cycles through all 12 players while you scroll */}
          <div className="hidden xl:block" style={{
            width: 260, flexShrink: 0,
            position: 'sticky', top: 80,
            height: 'calc(100vh - 120px)',
            borderRadius: 18, overflow: 'hidden',
          }}>
            <PlayerCarousel width={260} fillHeight />
          </div>

        </div>
      )}
    </div>
  )
}
