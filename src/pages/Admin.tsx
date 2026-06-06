import { useEffect, useState } from 'react'
import { Shield, Check, X, FlaskConical, Trash2, Shuffle, ChevronDown, ChevronUp, Minus, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Match, MatchResult } from '../types'
import { fmtDate, isLocked, getStageWeight } from '../lib/utils'

type ResultOption = 'T1_WIN' | 'DRAW' | 'T2_WIN'

interface EditState {
  matchNo: number
  result: ResultOption
  scoreA: string
  scoreB: string
}

interface LockTestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  detail: string
}

const RANDOM_RESULTS: ResultOption[] = ['T1_WIN', 'DRAW', 'T2_WIN']
function randomResult(): ResultOption {
  return RANDOM_RESULTS[Math.floor(Math.random() * 3)]
}
function randomScore(result: ResultOption): { a: number; b: number } {
  if (result === 'DRAW') { const g = Math.floor(Math.random() * 4); return { a: g, b: g } }
  const w = Math.floor(Math.random() * 4) + 1
  const l = Math.floor(Math.random() * w)
  return result === 'T1_WIN' ? { a: w, b: l } : { a: l, b: w }
}

export default function Admin() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [results, setResults] = useState<Record<number, MatchResult>>({})
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testMode, setTestMode] = useState(false)
  const [bulkCount, setBulkCount] = useState(5)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['Group Stage']))
  const [lockTests, setLockTests] = useState<LockTestResult[]>([])
  const [lockTesting, setLockTesting] = useState(false)

  useEffect(() => {
    async function load() {
      const [matchRes, resultRes] = await Promise.all([
        supabase.from('worldcup_schedule').select('*').order('DateTime_CST', { ascending: true }),
        supabase.from('match_results').select('*'),
      ])
      setMatches(matchRes.data ?? [])
      const resMap: Record<number, MatchResult> = {}
      for (const r of resultRes.data ?? []) resMap[r.match_no] = r
      setResults(resMap)
      setLoading(false)
    }
    load()
  }, [])

  function startEdit(match: Match) {
    const existing = results[match.MatchNo]
    setEditing({
      matchNo: match.MatchNo,
      result: existing?.result ?? 'T1_WIN',
      scoreA: String(existing?.score_team_a ?? ''),
      scoreB: String(existing?.score_team_b ?? ''),
    })
    setMsg(null)
  }

  async function saveResult() {
    if (!editing || !user) return
    setSaving(true)

    const payload = {
      match_no: editing.matchNo,
      result: editing.result,
      score_team_a: editing.scoreA !== '' ? parseInt(editing.scoreA, 10) : null,
      score_team_b: editing.scoreB !== '' ? parseInt(editing.scoreB, 10) : null,
      entered_by: user.id,
    }

    const existing = results[editing.matchNo]
    const { error } = existing
      ? await supabase.from('match_results').update(payload).eq('match_no', editing.matchNo)
      : await supabase.from('match_results').insert(payload)

    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setResults(prev => ({ ...prev, [editing.matchNo]: payload as MatchResult }))
      setMsg({ type: 'success', text: `Result saved for match #${editing.matchNo}` })
      setEditing(null)
    }
  }

  async function deleteResult(matchNo: number) {
    if (!confirm('Delete this result?')) return
    const { error } = await supabase.from('match_results').delete().eq('match_no', matchNo)
    if (!error) {
      setResults(prev => { const next = { ...prev }; delete next[matchNo]; return next })
      setMsg({ type: 'success', text: `Result deleted for match #${matchNo}` })
    }
  }

  // Bulk: randomise results for the next N upcoming matches that have no result yet
  async function bulkRandomise() {
    if (!user) return
    setBulkRunning(true)
    setMsg(null)
    const upcoming = matches.filter(m => !results[m.MatchNo]).slice(0, bulkCount)
    const payloads = upcoming.map(m => {
      const r = randomResult()
      const s = randomScore(r)
      return { match_no: m.MatchNo, result: r, score_team_a: s.a, score_team_b: s.b, entered_by: user.id }
    })
    const { error } = await supabase.from('match_results').insert(payloads)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      const next = { ...results }
      for (const p of payloads) next[p.match_no] = p as MatchResult
      setResults(next)
      setMsg({ type: 'success', text: `✓ Randomised results for ${payloads.length} matches` })
    }
    setBulkRunning(false)
  }

  // Delete all results that belong to future (test) matches
  async function clearTestResults() {
    const futureWithResults = matches
      .filter(m => !isLocked(m.DateTime_CST ?? '') && results[m.MatchNo])
      .map(m => m.MatchNo)
    if (!futureWithResults.length) { setMsg({ type: 'error', text: 'No test results to clear' }); return }
    if (!confirm(`Delete test results for ${futureWithResults.length} future matches?`)) return
    const { error } = await supabase.from('match_results').delete().in('match_no', futureWithResults)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setResults(prev => {
        const next = { ...prev }
        futureWithResults.forEach(n => delete next[n])
        return next
      })
      setMsg({ type: 'success', text: `✓ Cleared test results from ${futureWithResults.length} matches` })
    }
  }

  async function runLockTests() {
    if (!user) return
    setLockTesting(true)
    const out: LockTestResult[] = []

    // ── Test 1: isLocked() correctly identifies past dates ──
    const past   = new Date(Date.now() - 3_600_000).toISOString()
    const future = new Date(Date.now() + 3_600_000).toISOString()
    out.push({
      name: 'Frontend: isLocked() — past kickoff returns true',
      status: isLocked(past) ? 'pass' : 'fail',
      detail: isLocked(past)
        ? 'isLocked("1 hour ago") → true ✓'
        : 'BUG: isLocked("1 hour ago") returned false',
    })
    out.push({
      name: 'Frontend: isLocked() — future kickoff returns false',
      status: !isLocked(future) ? 'pass' : 'fail',
      detail: !isLocked(future)
        ? 'isLocked("1 hour from now") → false ✓'
        : 'BUG: isLocked("1 hour from now") returned true',
    })

    // Fetch this admin user's own predictions to test DB RLS
    const { data: myPreds } = await supabase
      .from('predictions')
      .select('id, match_no, t1_win_prob, draw_prob, t2_win_prob')
      .eq('user_id', user.id)

    const allPreds = myPreds ?? []

    // ── Test 2: DB blocks UPDATE on a locked match prediction ──
    const lockedPred = allPreds.find(p => {
      const m = matches.find(m => m.MatchNo === p.match_no)
      return m && isLocked(m.DateTime_CST ?? '')
    })

    if (!lockedPred) {
      out.push({
        name: 'Database RLS: UPDATE blocked on locked match',
        status: 'skip',
        detail: 'Skipped — you have no prediction on a past match yet. Make a prediction then let the match start, or use Test Mode to add a result to a past match first.',
      })
    } else {
      const m = matches.find(m => m.MatchNo === lockedPred.match_no)!
      // Attempt to update with identical values — the RLS policy should block it
      const { data, error } = await supabase
        .from('predictions')
        .update({
          t1_win_prob: lockedPred.t1_win_prob,
          draw_prob:   lockedPred.draw_prob,
          t2_win_prob: lockedPred.t2_win_prob,
        })
        .eq('id', lockedPred.id)
        .select('id')

      if (error) {
        out.push({
          name: 'Database RLS: UPDATE blocked on locked match',
          status: 'fail',
          detail: `Unexpected DB error: ${error.message}`,
        })
      } else if ((data?.length ?? 0) === 0) {
        out.push({
          name: 'Database RLS: UPDATE blocked on locked match',
          status: 'pass',
          detail: `Match #${m.MatchNo} (${m.TeamA} vs ${m.TeamB}) — 0 rows updated, RLS blocked it correctly ✓`,
        })
      } else {
        out.push({
          name: 'Database RLS: UPDATE blocked on locked match',
          status: 'fail',
          detail: `SECURITY ISSUE: ${data!.length} row(s) updated on a locked match — the DB policy is not working!`,
        })
      }
    }

    // ── Test 3: DB allows UPDATE on an upcoming match prediction ──
    const unlockedPred = allPreds.find(p => {
      const m = matches.find(m => m.MatchNo === p.match_no)
      return m && !isLocked(m.DateTime_CST ?? '')
    })

    if (!unlockedPred) {
      out.push({
        name: 'Database RLS: UPDATE allowed on upcoming match',
        status: 'skip',
        detail: 'Skipped — you have no prediction on an upcoming match. Make a prediction on a future match to test this.',
      })
    } else {
      const m = matches.find(m => m.MatchNo === unlockedPred.match_no)!
      // Update with identical values — this is a no-op but RLS should allow it
      const { data, error } = await supabase
        .from('predictions')
        .update({
          t1_win_prob: unlockedPred.t1_win_prob,
          draw_prob:   unlockedPred.draw_prob,
          t2_win_prob: unlockedPred.t2_win_prob,
        })
        .eq('id', unlockedPred.id)
        .select('id')

      if (error) {
        out.push({
          name: 'Database RLS: UPDATE allowed on upcoming match',
          status: 'fail',
          detail: `Unexpected DB error: ${error.message}`,
        })
      } else if ((data?.length ?? 0) > 0) {
        out.push({
          name: 'Database RLS: UPDATE allowed on upcoming match',
          status: 'pass',
          detail: `Match #${m.MatchNo} (${m.TeamA} vs ${m.TeamB}) — ${data!.length} row updated, RLS correctly allowed it ✓`,
        })
      } else {
        out.push({
          name: 'Database RLS: UPDATE allowed on upcoming match',
          status: 'fail',
          detail: 'BUG: 0 rows updated on a future match — the policy is blocking valid updates!',
        })
      }
    }

    setLockTests(out)
    setLockTesting(false)
  }

  function toggleStage(stage: string) {
    setExpandedStages(prev => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })
  }

  const displayMatches = testMode ? matches : matches.filter(m => m.DateTime_CST && isLocked(m.DateTime_CST))
  const testResultCount = matches.filter(m => !isLocked(m.DateTime_CST ?? '') && results[m.MatchNo]).length

  // Group by stage
  const stages = [...new Set(displayMatches.map(m => m.Stage ?? 'Unknown'))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Admin — Match Results</h1>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {Object.keys(results).length} results entered · {matches.filter(m => isLocked(m.DateTime_CST ?? '')).length} past matches
              {testResultCount > 0 && <span style={{ color: '#F59E0B', fontWeight: 700 }}> · {testResultCount} test results active</span>}
            </p>
          </div>
        </div>

        {/* Test mode toggle */}
        <button
          onClick={() => { setTestMode(t => !t); setEditing(null) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
            background: testMode ? 'rgba(245,158,11,0.1)' : '#F8FAFC',
            border: testMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid #E2E8F0',
            color: testMode ? '#B45309' : '#64748B',
            fontWeight: 700, fontSize: 13,
          }}
        >
          <FlaskConical size={15} />
          {testMode ? 'Test Mode ON' : 'Test Mode'}
        </button>
      </div>

      {/* ── Test mode banner ── */}
      {testMode && (
        <div style={{
          borderRadius: 14, padding: '16px 20px',
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <FlaskConical size={16} style={{ color: '#D97706' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>Testing Mode — all matches shown, including future ones</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Bulk randomise */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10 }}>
              <Shuffle size={14} style={{ color: '#64748B' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>Randomise next</span>
              <input
                type="number" min={1} max={20} value={bulkCount}
                onChange={e => setBulkCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                style={{ width: 44, textAlign: 'center', padding: '2px 6px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#0F172A' }}
              />
              <span style={{ fontSize: 13, color: '#475569' }}>matches</span>
              <button
                onClick={bulkRandomise}
                disabled={bulkRunning}
                style={{
                  padding: '4px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: 'linear-gradient(135deg,#16A34A,#15803D)', color: '#fff', border: 'none',
                  opacity: bulkRunning ? 0.6 : 1,
                }}
              >
                {bulkRunning ? 'Running…' : 'Go'}
              </button>
            </div>

            {/* Clear test results */}
            {testResultCount > 0 && (
              <button
                onClick={clearTestResults}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#DC2626', fontWeight: 700, fontSize: 13,
                }}
              >
                <Trash2 size={14} />
                Clear {testResultCount} test result{testResultCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Lock Enforcement Tests ── */}
      <div style={{ borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: '#F8FAFC',
          borderBottom: lockTests.length ? '1px solid #E2E8F0' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={16} style={{ color: '#7C3AED' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Lock Enforcement Tests</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                Verify predictions cannot be changed after kickoff
              </div>
            </div>
          </div>
          <button
            onClick={runLockTests}
            disabled={lockTesting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: lockTesting ? '#F1F5F9' : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
              color: lockTesting ? '#94A3B8' : '#fff', border: 'none',
              opacity: lockTesting ? 0.7 : 1,
            }}
          >
            <Play size={13} />
            {lockTesting ? 'Running…' : lockTests.length ? 'Re-run Tests' : 'Run Tests'}
          </button>
        </div>

        {lockTests.length > 0 && (
          <div style={{ padding: '14px 18px', display: 'grid', gap: 8 }}>
            {lockTests.map((t, i) => {
              const statusColor = t.status === 'pass' ? '#15803D' : t.status === 'fail' ? '#DC2626' : '#64748B'
              const statusBg    = t.status === 'pass' ? 'rgba(22,163,74,0.07)' : t.status === 'fail' ? 'rgba(239,68,68,0.07)' : '#F8FAFC'
              const statusBorder = t.status === 'pass' ? 'rgba(22,163,74,0.2)' : t.status === 'fail' ? 'rgba(239,68,68,0.2)' : '#E2E8F0'
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: statusBg, border: `1px solid ${statusBorder}`,
                }}>
                  <div style={{ marginTop: 1, flexShrink: 0 }}>
                    {t.status === 'pass' ? <Check size={15} style={{ color: '#15803D' }} />
                    : t.status === 'fail' ? <X size={15} style={{ color: '#DC2626' }} />
                    : <Minus size={15} style={{ color: '#94A3B8' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{t.detail}</div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                    padding: '3px 8px', borderRadius: 999,
                    background: t.status === 'pass' ? 'rgba(22,163,74,0.12)' : t.status === 'fail' ? 'rgba(239,68,68,0.12)' : '#F1F5F9',
                    color: statusColor,
                  }}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
              )
            })}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              {lockTests.filter(t => t.status === 'pass').length}/{lockTests.filter(t => t.status !== 'skip').length} tests passed
              {lockTests.some(t => t.status === 'skip') && ` · ${lockTests.filter(t => t.status === 'skip').length} skipped (need predictions to test DB layer)`}
            </div>
          </div>
        )}
      </div>

      {/* ── Status message ── */}
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: 12, fontSize: 13,
          background: msg.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: msg.type === 'success' ? '#15803D' : '#DC2626',
        }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {displayMatches.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          No matches to show. Enable Test Mode to see upcoming matches.
        </div>
      )}

      {/* ── Matches grouped by stage ── */}
      <div style={{ display: 'grid', gap: 10 }}>
        {stages.map(stage => {
          const stageMatches = displayMatches.filter(m => (m.Stage ?? 'Unknown') === stage)
          const hasResults = stageMatches.filter(m => results[m.MatchNo]).length
          const weight = getStageWeight(stage)
          const isOpen = expandedStages.has(stage)

          return (
            <div key={stage} className="card" style={{ overflow: 'hidden' }}>
              {/* Stage header */}
              <button
                onClick={() => toggleStage(stage)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{stage}</span>
                  {weight > 1 && (
                    <span style={{
                      fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 999,
                      background: weight >= 13 ? 'rgba(234,179,8,0.1)' : weight >= 8 ? 'rgba(168,85,247,0.1)' : weight >= 5 ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
                      color: weight >= 13 ? '#B45309' : weight >= 8 ? '#7C3AED' : weight >= 5 ? '#DC2626' : '#1D4ED8',
                    }}>×{weight}</span>
                  )}
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>
                    {hasResults}/{stageMatches.length} results
                  </span>
                </div>
                {isOpen ? <ChevronUp size={16} style={{ color: '#94A3B8' }} /> : <ChevronDown size={16} style={{ color: '#94A3B8' }} />}
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid #F1F5F9' }}>
                  {stageMatches.map(match => {
                    const res = results[match.MatchNo]
                    const isFuture = !isLocked(match.DateTime_CST ?? '')
                    const isEditingThis = editing?.matchNo === match.MatchNo

                    return (
                      <div key={match.MatchNo} style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid #F8FAFC',
                        background: isFuture && testMode ? 'rgba(245,158,11,0.02)' : 'transparent',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          {/* Match info */}
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 11, color: '#94A3B8' }}>#{match.MatchNo}</span>
                              {isFuture && testMode && (
                                <span style={{
                                  fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999,
                                  background: 'rgba(245,158,11,0.12)', color: '#B45309',
                                  border: '1px solid rgba(245,158,11,0.25)',
                                }}>TEST</span>
                              )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                              {match.TeamA} <span style={{ color: '#CBD5E1', fontWeight: 400 }}>vs</span> {match.TeamB}
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                              {match.DateTime_CST ? fmtDate(match.DateTime_CST) : '—'}
                            </div>
                          </div>

                          {/* Result badge + actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {res && !isEditingThis && (
                              <span style={{
                                fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                background: res.result === 'T1_WIN' ? 'rgba(37,99,235,0.08)' : res.result === 'DRAW' ? '#F1F5F9' : 'rgba(245,158,11,0.1)',
                                color: res.result === 'T1_WIN' ? '#2563EB' : res.result === 'DRAW' ? '#64748B' : '#B45309',
                              }}>
                                {res.result === 'T1_WIN' ? `${match.TeamA} Win`
                                : res.result === 'T2_WIN' ? `${match.TeamB} Win`
                                : 'Draw'}
                                {res.score_team_a != null && ` (${res.score_team_a}–${res.score_team_b})`}
                              </span>
                            )}
                            {!isEditingThis && (
                              <button
                                onClick={() => startEdit(match)}
                                style={{
                                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                                  background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569',
                                }}
                              >
                                {res ? 'Edit' : 'Enter Result'}
                              </button>
                            )}
                            {res && !isEditingThis && (
                              <button
                                onClick={() => deleteResult(match.MatchNo)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#94A3B8' }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline edit form */}
                        {isEditingThis && editing && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                              {(['T1_WIN', 'DRAW', 'T2_WIN'] as ResultOption[]).map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => setEditing({ ...editing, result: opt })}
                                  style={{
                                    padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    border: '1px solid',
                                    background: editing.result === opt
                                      ? (opt === 'T1_WIN' ? 'rgba(37,99,235,0.08)' : opt === 'DRAW' ? '#F1F5F9' : 'rgba(245,158,11,0.1)')
                                      : 'transparent',
                                    borderColor: editing.result === opt
                                      ? (opt === 'T1_WIN' ? 'rgba(37,99,235,0.3)' : opt === 'DRAW' ? '#CBD5E1' : 'rgba(245,158,11,0.4)')
                                      : '#E2E8F0',
                                    color: editing.result === opt
                                      ? (opt === 'T1_WIN' ? '#2563EB' : opt === 'DRAW' ? '#64748B' : '#B45309')
                                      : '#94A3B8',
                                  }}
                                >
                                  {opt === 'T1_WIN' ? `${match.TeamA} Win` : opt === 'T2_WIN' ? `${match.TeamB} Win` : 'Draw'}
                                </button>
                              ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 4 }}>{match.TeamA}</label>
                                <input type="number" min={0} className="input" style={{ textAlign: 'center' }}
                                  placeholder="—" value={editing.scoreA}
                                  onChange={e => setEditing({ ...editing, scoreA: e.target.value })} />
                              </div>
                              <span style={{ color: '#CBD5E1', fontWeight: 700, marginTop: 20 }}>–</span>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 4 }}>{match.TeamB}</label>
                                <input type="number" min={0} className="input" style={{ textAlign: 'center' }}
                                  placeholder="—" value={editing.scoreB}
                                  onChange={e => setEditing({ ...editing, scoreB: e.target.value })} />
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditing(null)}
                                style={{ padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}>
                                Cancel
                              </button>
                              <button onClick={saveResult} disabled={saving}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                  background: 'linear-gradient(135deg,#16A34A,#15803D)', color: '#fff', border: 'none',
                                  opacity: saving ? 0.7 : 1,
                                }}>
                                <Check size={14} />
                                {saving ? 'Saving…' : 'Save Result'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
