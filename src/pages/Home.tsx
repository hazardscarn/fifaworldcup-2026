import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Match, Prediction, MatchResult, LeaderboardEntry } from '../types'
import MatchCard from '../components/MatchCard'
import PlayerStrip from '../components/PlayerStrip'
import PlayerCarousel from '../components/PlayerCarousel'
import { fmtScore, isLocked } from '../lib/utils'
import { trophyIcon } from '../lib/images'

const WC_INTRO_VIDEO_URL = 'https://wpjwlrmprkgqlphbpjjy.supabase.co/storage/v1/object/public/videos/wcintro.mp4'

interface Countdown { days: number; hours: number; minutes: number; seconds: number }
function pad(n: number) { return String(n).padStart(2, '0') }

export default function Home() {
  const { user, profile } = useAuth()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [results, setResults] = useState<Record<number, MatchResult>>({})
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextMatch, setNextMatch] = useState<Match | null>(null)
  const [countdown, setCountdown] = useState<Countdown | null>(null)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Callback ref runs synchronously on DOM attach — sets muted before autoplay fires.
  // React never touches .muted after this, so toggleMute() keeps full control.
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) { node.muted = true; videoRef.current = node }
  }, [])

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
      const upcoming = all.filter(m => m.DateTime_CST && !isLocked(m.DateTime_CST))
      setUpcomingMatches(upcoming.slice(0, 4))
      setRecentMatches(all.filter(m => m.DateTime_CST && isLocked(m.DateTime_CST)).slice(-3).reverse())
      setNextMatch(upcoming[0] ?? null)

      const predMap: Record<number, Prediction> = {}
      for (const p of predRes.data ?? []) predMap[p.match_no] = p

      const lockedNoPred = all.filter(m => m.DateTime_CST && isLocked(m.DateTime_CST) && !predMap[m.MatchNo])
      if (lockedNoPred.length > 0) {
        const { data: inserted } = await supabase.from('predictions').insert(
          lockedNoPred.map(m => ({
            user_id: user!.id, match_no: m.MatchNo,
            t1_win_prob: 0.34, draw_prob: 0.33, t2_win_prob: 0.33,
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

  // Countdown ticker — resets whenever nextMatch changes
  useEffect(() => {
    if (!nextMatch?.DateTime_CST) { setCountdown(null); return }
    const target = new Date(nextMatch.DateTime_CST).getTime()

    function tick() {
      const diff = target - Date.now()
      if (diff <= 0) {
        setCountdown(null)
        // Refetch to find the new next upcoming match
        supabase.from('worldcup_schedule').select('*').order('DateTime_CST', { ascending: true })
          .then(({ data }) => {
            const all: Match[] = data ?? []
            const upcoming = all.filter(m => m.DateTime_CST && !isLocked(m.DateTime_CST))
            setNextMatch(upcoming[0] ?? null)
            setUpcomingMatches(upcoming.slice(0, 4))
            setRecentMatches(all.filter(m => m.DateTime_CST && isLocked(m.DateTime_CST)).slice(-3).reverse())
          })
        return
      }
      setCountdown({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextMatch])

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

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

      {/* ── Cinematic Masthead: Welcome + Video + Countdown ── */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', position: 'relative',
        height: 520, background: '#0A0F1E',
        boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Background video */}
        <video
          ref={videoCallbackRef}
          src={WC_INTRO_VIDEO_URL}
          autoPlay loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Top-left dark vignette for welcome text readability */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(8,12,24,0.88) 0%, rgba(8,12,24,0.55) 35%, transparent 65%)',
        }} />
        {/* Bottom fade for match text */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(8,12,24,0.88) 0%, rgba(8,12,24,0.0) 38%)',
        }} />

        {/* ── Right frosted countdown panel ── */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 160, zIndex: 2,
          background: 'rgba(5,8,20,0.60)', backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px 0',
        }}>
          {nextMatch ? (
            <>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 20 }}>
                ⚽ Kicks Off In
              </div>
              {countdown ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {[
                    { value: countdown.days,    label: 'Days' },
                    { value: countdown.hours,   label: 'Hours' },
                    { value: countdown.minutes, label: 'Mins' },
                    { value: countdown.seconds, label: 'Secs' },
                  ].map(({ value, label }, i) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      {i > 0 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', lineHeight: 1, margin: '2px 0' }}>·</div>}
                      <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums', textShadow: '0 0 24px rgba(74,222,128,0.5)' }}>
                        {pad(value)}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 30 }}>🟢</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80', marginTop: 8 }}>Live Now!</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '0 12px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>All matches complete!</div>
            </div>
          )}

          <button onClick={toggleMute} style={{
            marginTop: 24,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999, padding: '5px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600,
          }}>
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        {/* ── Top-left: Welcome hero ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 160, zIndex: 2, padding: '32px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <img src={trophyIcon} alt="FIFA" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6 }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#4ade80' }}>
              FIFA World Cup 2026 · Prediction League
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#fff',
            marginBottom: 10, lineHeight: 1.12, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            Welcome back,<br />{profile?.display_name}
          </h1>
          {myRank ? (
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 22 }}>
              Ranked <span style={{ color: '#FBBF24', fontWeight: 700 }}>#{myRank.rank}</span>
              {' · '}Score{' '}
              <span style={{ fontWeight: 700, color: myRank.total_score >= 0 ? '#4ade80' : '#f87171' }}>
                {fmtScore(myRank.total_score)}
              </span>
            </p>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 22 }}>
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

        {/* ── Bottom-left: Next match info ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 160, zIndex: 2, padding: '48px 36px 24px' }}>
          {nextMatch ? (
            <>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 6 }}>
                Next Match
              </div>
              <div style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 900, color: '#fff',
                lineHeight: 1.1, marginBottom: 6, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                {nextMatch.TeamA} vs {nextMatch.TeamB}
              </div>
              {nextMatch.DateTime_CST && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
                  {nextMatch.Stage} · {new Date(nextMatch.DateTime_CST).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })} · {new Date(nextMatch.DateTime_CST).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                What a tournament!
              </div>
            </div>
          )}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {upcomingMatches.map((m, i) => (
                  <div key={m.MatchNo} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <MatchCard match={m} prediction={predictions[m.MatchNo]} result={results[m.MatchNo]} />
                  </div>
                ))}
              </div>
            </div>
            <PlayerCarousel width={320} />
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
