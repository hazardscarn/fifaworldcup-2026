import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Match, Prediction, MatchResult, LeaderboardEntry } from '../types'
import MatchCard from '../components/MatchCard'
import PlayerStrip from '../components/PlayerStrip'
import PlayerCarousel from '../components/PlayerCarousel'
import { fmtScore, isLocked } from '../lib/utils'
import { messVsCr7, trophyIcon } from '../lib/images'

export default function Home() {
  const { user, profile } = useAuth()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [results, setResults] = useState<Record<number, MatchResult>>({})
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [matchRes, predRes, resultRes, rankRes] = await Promise.all([
        supabase.from('worldcup_schedule').select('*').order('DateTime_CST', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
        supabase.from('match_results').select('*'),
        supabase.from('leaderboard').select('*').eq('user_id', user!.id).single(),
      ])

      const all: Match[] = matchRes.data ?? []
      setUpcomingMatches(all.filter(m => m.DateTime_CST && !isLocked(m.DateTime_CST)).slice(0, 6))
      setRecentMatches(all.filter(m => m.DateTime_CST && isLocked(m.DateTime_CST)).slice(-3).reverse())

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

      setMyRank(rankRes.data ?? null)
      setLoading(false)
    }
    load()
  }, [user])

  const predictedCount = Object.keys(predictions).length
  const scoredCount = Object.values(predictions).filter(p => results[p.match_no]).length
  const unpredictedUpcoming = upcomingMatches.filter(m => !predictions[m.MatchNo]).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <div style={{
        borderRadius: 20, background: '#0F172A',
        overflow: 'hidden', display: 'flex', alignItems: 'stretch',
        boxShadow: '0 4px 32px rgba(0,0,0,0.15)', minHeight: 240,
      }}>
        <div style={{ flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <img src={trophyIcon} alt="FIFA" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 6 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#4ade80' }}>
              FIFA World Cup 2026 · Prediction League
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8, lineHeight: 1.15 }}>
            Welcome back, {profile?.display_name}
          </h1>
          {myRank ? (
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>
              Ranked <span style={{ color: '#FBBF24', fontWeight: 700 }}>#{myRank.rank}</span>
              {' '}· Score{' '}
              <span style={{ fontWeight: 700, color: myRank.total_score >= 0 ? '#4ade80' : '#f87171' }}>
                {fmtScore(myRank.total_score)}
              </span>
            </p>
          ) : (
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
              Make your first prediction to get on the board!
            </p>
          )}
          {unpredictedUpcoming > 0 && (
            <Link to="/schedule" className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', width: 'fit-content' }}>
              ⚡ {unpredictedUpcoming} match{unpredictedUpcoming !== 1 ? 'es' : ''} need your prediction
              <ChevronRight size={15} />
            </Link>
          )}
        </div>
        <div className="hidden md:block" style={{ width: '40%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <img src={messVsCr7} alt="Messi vs CR7" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, #0F172A 0%, rgba(15,23,42,0.2) 40%, transparent 70%)',
          }} />
        </div>
      </div>

      {/* ── Player strip ── */}
      <PlayerStrip height={148} />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '🏆', label: 'Your Rank',   value: myRank ? `#${myRank.rank}` : '—',           sub: 'on leaderboard' },
          { icon: '📈', label: 'Total Score', value: myRank ? fmtScore(myRank.total_score) : '—', sub: `avg ${fmtScore(myRank?.avg_score ?? null)}` },
          { icon: '🎯', label: 'Predicted',   value: String(predictedCount),                       sub: 'matches' },
          { icon: '⚡', label: 'Scored',      value: String(scoredCount),                          sub: 'with results' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Upcoming matches + player carousel ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="section-title">Upcoming Matches</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Make Your Picks</h2>
          </div>
          <Link to="/schedule" className="btn-ghost" style={{ color: '#16A34A', fontWeight: 600 }}>
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="card p-8 text-center" style={{ color: '#94A3B8' }}>No upcoming matches yet.</div>
        ) : (
          <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {upcomingMatches.map((m, i) => (
                  <div key={m.MatchNo} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <MatchCard match={m} prediction={predictions[m.MatchNo]} result={results[m.MatchNo]} />
                  </div>
                ))}
              </div>
            </div>
            <PlayerCarousel width={260} />
          </div>
        )}
      </div>

      {/* ── Recent results ── */}
      {recentMatches.length > 0 && (
        <div>
          <div className="section-title mb-3">Recent Results</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {recentMatches.map(m => (
              <MatchCard key={m.MatchNo} match={m}
                prediction={predictions[m.MatchNo]} result={results[m.MatchNo]} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
