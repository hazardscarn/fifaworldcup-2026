import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LeaderboardEntry } from '../types'
import { fmtScore, getFlag, getStageWeight } from '../lib/utils'
import FlagImage from '../components/FlagImage'
import { allStars1 } from '../lib/images'

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) {
    return <div style={{ fontSize: 10, color: '#CBD5E1', textAlign: 'center' }}>—</div>
  }
  const W = 110, H = 38, PAD = 3
  const min = Math.min(0, ...data)
  const max = Math.max(0, ...data)
  const range = max - min || 1
  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2)
  const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const zeroY = toY(0)
  const color = positive ? '#16A34A' : '#DC2626'
  const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const fill = [
    `${toX(0).toFixed(1)},${zeroY.toFixed(1)}`,
    ...data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
    `${toX(data.length - 1).toFixed(1)},${zeroY.toFixed(1)}`,
  ].join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#E2E8F0" strokeWidth={1} />
      <polygon points={fill} fill={positive ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.1)'} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1])} r={2.5} fill={color} />
    </svg>
  )
}

const RANK_STYLE: Record<number, { bg: string; border: string; rankColor: string }> = {
  1: { bg: 'rgba(250,204,21,0.06)',  border: 'rgba(250,204,21,0.25)',  rankColor: '#D97706' },
  2: { bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)',  rankColor: '#64748B' },
  3: { bg: 'rgba(205,127,50,0.06)',  border: 'rgba(205,127,50,0.2)',   rankColor: '#B45309' },
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [sparkData, setSparkData] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('leaderboard').select('*').order('total_score', { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })

    supabase
      .from('prediction_scores')
      .select('user_id, score, stage, kickoff')
      .not('result', 'is', null)
      .order('kickoff', { ascending: true })
      .then(({ data }) => {
        if (!data) return
        const cum: Record<string, number[]> = {}
        const running: Record<string, number> = {}
        data.forEach(row => {
          if (!cum[row.user_id]) { cum[row.user_id] = [0]; running[row.user_id] = 0 }
          running[row.user_id] += (row.score ?? 0) * getStageWeight(row.stage)
          cum[row.user_id].push(parseFloat(running[row.user_id].toFixed(4)))
        })
        setSparkData(cum)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div style={{
        borderRadius: 20, background: '#0F172A',
        overflow: 'hidden', display: 'flex', alignItems: 'stretch',
        boxShadow: '0 4px 32px rgba(0,0,0,0.15)', minHeight: 200,
      }}>
        <div className="hidden md:block" style={{ width: '40%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <img src={allStars1} alt="World Cup Stars" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 20%',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, #0F172A 0%, rgba(15,23,42,0.1) 60%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #F59E0B, #FCD34D, #F59E0B, transparent)' }} />
        </div>
        <div style={{ flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#FBBF24', marginBottom: 10 }}>
            FIFA World Cup 2026
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Trophy size={24} style={{ color: '#FBBF24', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }} />
            Prediction Standings
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 13 }}>
            {entries.length} players · Ranked by weighted log-score
          </p>
        </div>
      </div>

      {/* ── Scoring rule ── */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>📊</span>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: '#0F172A', fontWeight: 700 }}>Formula: </span>
            <code style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 10px', borderRadius: 6, color: '#15803D', fontFamily: 'monospace', fontSize: 12 }}>
              Stage Weight × ln(3 × P)
            </code>
            <span style={{ color: '#64748B' }}> · Equal split = 0 · Perfect = +Weight × 1.099 · Confident & wrong = big negative</span>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 8 }}>
            Stage Multipliers — It ain't over till the Final!
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'Group Stage', w: 1,  color: '#64748B', bg: '#F1F5F9' },
              { label: 'Round of 32', w: 2,  color: '#1D4ED8', bg: 'rgba(59,130,246,0.1)' },
              { label: 'Round of 16', w: 3,  color: '#1D4ED8', bg: 'rgba(59,130,246,0.1)' },
              { label: 'Quarter-Final', w: 5,  color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
              { label: 'Third Place',  w: 6,  color: '#EA580C', bg: 'rgba(234,88,12,0.08)' },
              { label: 'Semi-Final',   w: 8,  color: '#7C3AED', bg: 'rgba(168,85,247,0.1)' },
              { label: 'Final',        w: 13, color: '#B45309', bg: 'rgba(234,179,8,0.12)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: s.bg }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: s.color }}>×{s.w}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          No predictions scored yet. Be the first!
        </div>
      ) : (
        /* ── Full leaderboard table ── */
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr 120px 80px 90px 120px',
            gap: 0,
            padding: '10px 20px',
            borderBottom: '2px solid #F1F5F9',
            background: '#FAFAFA',
          }}>
            {['Rank', 'Player', 'Score', 'Avg', 'Picks', 'Trend'].map((h, i) => (
              <div key={h} style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: '#94A3B8',
                textAlign: i >= 2 ? 'right' : 'left',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {entries.map((entry, idx) => {
            const rank = idx + 1
            const isMe = entry.user_id === user?.id
            const rs = RANK_STYLE[rank]
            const isPos = entry.total_score >= 0
            const spark = sparkData[entry.user_id] ?? []

            return (
              <div
                key={entry.user_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr 120px 80px 90px 120px',
                  gap: 0,
                  padding: '14px 20px',
                  alignItems: 'center',
                  borderBottom: '1px solid #F8FAFC',
                  background: isMe
                    ? 'rgba(22,163,74,0.04)'
                    : rs ? rs.bg : 'transparent',
                  borderLeft: isMe ? '3px solid #16A34A' : rs ? `3px solid ${rs.border}` : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Rank */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  {MEDAL[rank] ? (
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{MEDAL[rank]}</span>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#94A3B8' }}>#{rank}</span>
                  )}
                </div>

                {/* Player */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isMe
                      ? 'linear-gradient(135deg, #16A34A, #15803D)'
                      : rs
                      ? `linear-gradient(135deg, ${rs.rankColor}22, ${rs.rankColor}44)`
                      : 'linear-gradient(135deg, #E2E8F0, #CBD5E1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900,
                    color: isMe ? '#fff' : rs ? rs.rankColor : '#64748B',
                  }}>
                    {entry.display_name[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.display_name}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999, background: 'rgba(22,163,74,0.1)', color: '#15803D', border: '1px solid rgba(22,163,74,0.25)', flexShrink: 0 }}>
                          You
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <FlagImage team={entry.favorite_team} size="sm" />
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>
                        {entry.email ?? `@${entry.username}`}
                        {entry.favorite_team && <span> · {entry.favorite_team} {getFlag(entry.favorite_team)}</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total score */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 18, fontWeight: 900,
                    color: entry.total_score > 0 ? '#15803D' : entry.total_score < 0 ? '#DC2626' : '#94A3B8',
                  }}>
                    {fmtScore(entry.total_score)}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    {entry.matches_scored} scored
                  </div>
                </div>

                {/* Avg */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: entry.avg_score == null ? '#CBD5E1'
                      : entry.avg_score > 0 ? '#15803D'
                      : entry.avg_score < 0 ? '#DC2626'
                      : '#94A3B8',
                  }}>
                    {entry.avg_score != null ? fmtScore(entry.avg_score) : '—'}
                  </span>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>per match</div>
                </div>

                {/* Picks made/scored */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    {entry.predictions_made}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}> made</span>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    {entry.matches_scored} with result
                  </div>
                </div>

                {/* Score trend sparkline */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkline data={spark} positive={isPos} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
