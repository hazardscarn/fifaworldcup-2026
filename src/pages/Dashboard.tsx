import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ChevronDown, TrendingUp, Target, Award, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LeaderboardEntry, PredictionScore } from '../types'
import { fmtScore, getFlag, getStageWeight } from '../lib/utils'

// ── Custom tooltip for the chart ──────────────────────────────────────────────
function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isPos = d.matchScore >= 0

  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0',
      borderRadius: 12, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 190,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
        {d.teamA} vs {d.teamB}
      </div>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{d.date}</div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Match</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: isPos ? '#15803D' : '#DC2626' }}>
            {fmtScore(d.matchScore)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: d.cumScore >= 0 ? '#15803D' : '#DC2626' }}>
            {fmtScore(d.cumScore)}
          </div>
        </div>
      </div>
      {d.result && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: d.result === 'T1_WIN' ? 'rgba(22,163,74,0.1)' : d.result === 'DRAW' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: d.result === 'T1_WIN' ? '#15803D' : d.result === 'DRAW' ? '#B45309' : '#DC2626',
          }}>
            {d.result === 'T1_WIN' ? `${d.teamA} Win` : d.result === 'DRAW' ? 'Draw' : `${d.teamB} Win`}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Result label helper ───────────────────────────────────────────────────────
function resultLabel(result: string | null, teamA: string, teamB: string) {
  if (!result) return '—'
  if (result === 'T1_WIN') return `${teamA} Win`
  if (result === 'DRAW') return 'Draw'
  return `${teamB} Win`
}

function resultColor(result: string | null) {
  if (result === 'T1_WIN') return { bg: 'rgba(22,163,74,0.1)', color: '#15803D' }
  if (result === 'DRAW') return { bg: 'rgba(245,158,11,0.1)', color: '#B45309' }
  if (result === 'T2_WIN') return { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' }
  return { bg: '#F1F5F9', color: '#64748B' }
}

// ── Which prob did they put on the correct outcome? ───────────────────────────
function pickedProb(ps: PredictionScore) {
  if (!ps.result) return null
  if (ps.result === 'T1_WIN') return ps.t1_win_prob
  if (ps.result === 'DRAW') return ps.draw_prob
  return ps.t2_win_prob
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<LeaderboardEntry[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [picks, setPicks] = useState<PredictionScore[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [loadingPicks, setLoadingPicks] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Fetch all players from leaderboard
  useEffect(() => {
    supabase.from('leaderboard').select('*').order('rank', { ascending: true }).then(({ data }) => {
      setPlayers(data ?? [])
      // Default: current user
      const me = data?.find(p => p.user_id === user?.id)
      setSelectedId(me?.user_id ?? data?.[0]?.user_id ?? '')
      setLoadingPlayers(false)
    })
  }, [user])

  // Fetch picks whenever selected player changes
  useEffect(() => {
    if (!selectedId) return
    setLoadingPicks(true)
    supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', selectedId)
      .not('result', 'is', null)
      .order('kickoff', { ascending: true })
      .then(({ data }) => {
        setPicks(data ?? [])
        setLoadingPicks(false)
      })
  }, [selectedId])

  const selectedPlayer = players.find(p => p.user_id === selectedId)

  // Build chart data with running cumulative weighted score
  const chartData = useMemo(() => {
    let cum = 0
    return picks.map(ps => {
      const w = getStageWeight(ps.stage)
      const wscore = (ps.score ?? 0) * w
      cum += wscore
      return {
        teamA: ps.team_a,
        teamB: ps.team_b,
        stage: ps.stage,
        stageWeight: w,
        date: new Date(ps.kickoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        matchScore: parseFloat(wscore.toFixed(4)),
        cumScore: parseFloat(cum.toFixed(4)),
        result: ps.result,
      }
    })
  }, [picks])

  const totalScore = chartData.reduce((s, d) => s + d.matchScore, 0)
  const best = chartData.length ? chartData.reduce((a, b) => a.matchScore > b.matchScore ? a : b) : null
  const worst = chartData.length ? chartData.reduce((a, b) => a.matchScore < b.matchScore ? a : b) : null
  const yMin = chartData.length ? Math.min(0, ...chartData.map(d => d.cumScore)) : 0
  const yMax = chartData.length ? Math.max(0, ...chartData.map(d => d.cumScore)) : 1

  if (loadingPlayers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="section-title">Analytics</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>Score history and pick breakdown for any player</p>
        </div>

        {/* Player picker dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', border: '1px solid #E2E8F0',
              borderRadius: 12, padding: '10px 16px', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minWidth: 220,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #16A34A, #15803D)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 800, flexShrink: 0,
            }}>
              {selectedPlayer?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{selectedPlayer?.display_name ?? 'Select player'}</div>
              {selectedPlayer && (
                <div style={{ fontSize: 11, color: '#94A3B8' }}>Rank #{selectedPlayer.rank} · {fmtScore(selectedPlayer.total_score)}</div>
              )}
            </div>
            <ChevronDown size={15} style={{ color: '#94A3B8', flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)', minWidth: 240,
              overflow: 'hidden',
            }}>
              {players.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => { setSelectedId(p.user_id); setDropdownOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px', textAlign: 'left',
                    background: p.user_id === selectedId ? '#F0FDF4' : 'transparent',
                    border: 'none', cursor: 'pointer', borderBottom: '1px solid #F8FAFC',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: p.user_id === selectedId ? 'linear-gradient(135deg, #16A34A, #15803D)' : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    color: p.user_id === selectedId ? '#fff' : '#64748B', flexShrink: 0,
                  }}>
                    {p.display_name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.display_name}
                      {p.favorite_team && <span style={{ fontSize: 14 }}>{getFlag(p.favorite_team)}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>#{p.rank} · {fmtScore(p.total_score)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Player stat cards ── */}
      {selectedPlayer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <Award size={18} style={{ color: '#F59E0B' }} />, label: 'Rank',       value: `#${selectedPlayer.rank}`,                       sub: `of ${players.length} players` },
            { icon: <TrendingUp size={18} style={{ color: '#16A34A' }} />, label: 'Total Score',  value: fmtScore(selectedPlayer.total_score),       sub: `avg ${fmtScore(selectedPlayer.avg_score)}` },
            { icon: <Target size={18} style={{ color: '#3B82F6' }} />,   label: 'Picks Scored', value: String(selectedPlayer.matches_scored),      sub: 'completed matches' },
            { icon: <BarChart2 size={18} style={{ color: '#8B5CF6' }} />, label: 'Picks Made',   value: String(selectedPlayer.predictions_made),   sub: 'total predictions' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div style={{ marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {loadingPicks ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : picks.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          No completed picks yet for {selectedPlayer?.display_name}.
        </div>
      ) : (
        <>
          {/* ── Score progression chart ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8' }}>Score Progression</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                Cumulative score over {picks.length} match{picks.length !== 1 ? 'es' : ''}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Final Total</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: totalScore >= 0 ? '#15803D' : '#DC2626' }}>{fmtScore(totalScore)}</div>
              </div>
              {best && (
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Pick</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#15803D' }}>{fmtScore(best.matchScore)}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{best.teamA} vs {best.teamB}{best.stageWeight > 1 ? ` ×${best.stageWeight}` : ''}</div>
                </div>
              )}
              {worst && (
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Worst Pick</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#DC2626' }}>{fmtScore(worst.matchScore)}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{worst.teamA} vs {worst.teamB}{worst.stageWeight > 1 ? ` ×${worst.stageWeight}` : ''}</div>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[yMin - 0.1, yMax + 0.1]}
                  tickFormatter={v => (v >= 0 ? '+' : '') + v.toFixed(2)}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3" />
                <Area
                  type="monotone"
                  dataKey="cumScore"
                  stroke={totalScore >= 0 ? '#16A34A' : '#EF4444'}
                  strokeWidth={2.5}
                  fill={totalScore >= 0 ? 'url(#posGradient)' : 'url(#negGradient)'}
                  dot={{ fill: totalScore >= 0 ? '#16A34A' : '#EF4444', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Past picks table ── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8' }}>Match History</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>All completed picks</div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {['Match', 'Date', 'Prediction', 'Result', 'Score'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Score' ? 'right' : 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...picks].reverse().map((ps, i) => {
                    const rc = resultColor(ps.result)
                    const prob = pickedProb(ps)
                    const w = getStageWeight(ps.stage)
                    const score = (ps.score ?? 0) * w
                    const isWin = score > 0

                    return (
                      <tr key={ps.id} style={{ borderBottom: i < picks.length - 1 ? '1px solid #F8FAFC' : 'none', background: i % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>
                            {getFlag(ps.team_a)} {ps.team_a} <span style={{ color: '#94A3B8', fontWeight: 400 }}>vs</span> {ps.team_b} {getFlag(ps.team_b)}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {ps.stage}
                            {w > 1 && <span style={{ fontWeight: 800, color: w >= 13 ? '#B45309' : w >= 8 ? '#7C3AED' : w >= 5 ? '#DC2626' : '#1D4ED8', fontSize: 10 }}>×{w}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {new Date(ps.kickoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {[
                              { label: ps.team_a, val: ps.t1_win_prob, key: 'T1_WIN' },
                              { label: 'Draw', val: ps.draw_prob, key: 'DRAW' },
                              { label: ps.team_b, val: ps.t2_win_prob, key: 'T2_WIN' },
                            ].map(opt => {
                              const isCorrect = opt.key === ps.result
                              return (
                                <span key={opt.key} style={{
                                  fontSize: 11, fontWeight: isCorrect ? 800 : 500,
                                  padding: '2px 7px', borderRadius: 999,
                                  background: isCorrect ? 'rgba(22,163,74,0.12)' : '#F1F5F9',
                                  color: isCorrect ? '#15803D' : '#64748B',
                                  border: isCorrect ? '1px solid rgba(22,163,74,0.3)' : '1px solid transparent',
                                }}>
                                  {Math.round(opt.val * 100)}%
                                  <span style={{ opacity: 0.7, marginLeft: 3 }}>
                                    {opt.label.length > 6 ? opt.label.slice(0, 6) : opt.label}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                          {prob !== null && (
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                              Put {Math.round(prob * 100)}% on the right outcome
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                            background: rc.bg, color: rc.color, whiteSpace: 'nowrap',
                          }}>
                            {resultLabel(ps.result, ps.team_a, ps.team_b)}
                          </span>
                          {ps.score_team_a !== null && ps.score_team_b !== null && (
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                              {ps.score_team_a} – {ps.score_team_b}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: 14, fontWeight: 800,
                            color: isWin ? '#15803D' : '#DC2626',
                          }}>
                            {fmtScore(score)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
