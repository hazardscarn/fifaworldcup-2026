import { useState, useMemo } from 'react'
import { Info, Zap, Trophy, TrendingUp, AlertTriangle, Calculator } from 'lucide-react'
import { getStageWeight, fmtScore } from '../lib/utils'

const STAGES = [
  { label: 'Group Stage',   weight: 1 },
  { label: 'Round of 32',  weight: 2 },
  { label: 'Round of 16',  weight: 3 },
  { label: 'Quarter-Final', weight: 5 },
  { label: 'Third Place',   weight: 6 },
  { label: 'Semi-Final',    weight: 8 },
  { label: 'Final',         weight: 13 },
]

const WEIGHT_COLORS: Record<number, { color: string; bg: string; border: string }> = {
  1:  { color: '#64748B', bg: '#F1F5F9',               border: '#E2E8F0' },
  2:  { color: '#1D4ED8', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  3:  { color: '#1D4ED8', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  5:  { color: '#DC2626', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
  6:  { color: '#EA580C', bg: 'rgba(234,88,12,0.08)',  border: 'rgba(234,88,12,0.2)' },
  8:  { color: '#7C3AED', bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.25)' },
  13: { color: '#B45309', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)' },
}

type OutcomeResult = 'T1_WIN' | 'DRAW' | 'T2_WIN'

interface FixedExample {
  label: string; desc: string; note: string; stage: string
  t1: number; draw: number; t2: number; result: OutcomeResult
}

const FIXED_EXAMPLES: FixedExample[] = [
  {
    label: 'The Safe Fence-Sitter',
    desc: '34% / 33% / 33% — basically saying "I have no idea"',
    t1: 0.34, draw: 0.33, t2: 0.33,
    result: 'T1_WIN',
    stage: 'Group Stage',
    note: 'Near-zero score. You were right but didn\'t commit, so you barely earn anything. Playing it safe is just that — safe, but boring.',
  },
  {
    label: 'The Confident Expert',
    desc: '80% / 10% / 10% — backing your favourite heavily',
    t1: 0.80, draw: 0.10, t2: 0.10,
    result: 'T1_WIN' ,
    stage: 'Group Stage',
    note: 'Nice positive score. Backing your conviction when right pays off.',
  },
  {
    label: 'The Overconfident Fool',
    desc: '98% / 1% / 1% — "it\'s obviously them"',
    t1: 0.98, draw: 0.01, t2: 0.01,
    result: 'T2_WIN' ,
    stage: 'Group Stage',
    note: 'Catastrophic. Putting 98% on the wrong team gives you ln(3 × 0.01) ≈ −3.5. You\'ve just torched your standings.',
  },
  {
    label: 'Final Upset — The Budget Nuker',
    desc: '98% / 1% / 1% — same overconfident pick, but in the Final',
    t1: 0.98, draw: 0.01, t2: 0.01,
    result: 'T2_WIN' ,
    stage: 'Final',
    note: 'Score × 13. That\'s ≈ −45 points in a single match. Tournament over. This is why late stages are not a drill.',
  },
  {
    label: 'Final Genius — The Jackpot',
    desc: '85% / 10% / 5% — confident correct call in the Final',
    t1: 0.85, draw: 0.10, t2: 0.05,
    result: 'T1_WIN' ,
    stage: 'Final',
    note: 'Score × 13. One brilliant Final prediction can flip the whole leaderboard. Never count anyone out.',
  },
]

function calcRaw(prob: number) {
  if (prob <= 0) return -Infinity
  return Math.log(3 * prob)
}

// ── Interactive Demo Calculator ───────────────────────────────────────────────
function ScoreCalculator() {
  const [t1, setT1] = useState(50)
  const [draw, setDraw] = useState(25)
  const [t2, setT2] = useState(25)
  const [stage, setStage] = useState('Group Stage')
  const [result, setResult] = useState<'T1_WIN' | 'DRAW' | 'T2_WIN'>('T1_WIN')

  const total = t1 + draw + t2
  const valid = Math.abs(total - 100) < 0.5

  const prob = result === 'T1_WIN' ? t1 / 100 : result === 'DRAW' ? draw / 100 : t2 / 100
  const weight = getStageWeight(stage)
  const rawScore = valid ? calcRaw(prob) : null
  const weightedScore = rawScore != null ? rawScore * weight : null
  const wc = WEIGHT_COLORS[weight] ?? WEIGHT_COLORS[1]

  function setAndBalance(field: 'T1' | 'DRAW' | 'T2', val: number) {
    if (field === 'T1') {
      const rem = Math.max(0, 100 - val)
      const ratio = draw + t2 > 0 ? draw / (draw + t2) : 0.5
      setT1(val)
      setDraw(parseFloat((rem * ratio).toFixed(1)))
      setT2(parseFloat((rem * (1 - ratio)).toFixed(1)))
    } else if (field === 'DRAW') {
      const rem = Math.max(0, 100 - val)
      const ratio = t1 + t2 > 0 ? t1 / (t1 + t2) : 0.5
      setDraw(val)
      setT1(parseFloat((rem * ratio).toFixed(1)))
      setT2(parseFloat((rem * (1 - ratio)).toFixed(1)))
    } else {
      const rem = Math.max(0, 100 - val)
      const ratio = t1 + draw > 0 ? t1 / (t1 + draw) : 0.5
      setT2(val)
      setT1(parseFloat((rem * ratio).toFixed(1)))
      setDraw(parseFloat((rem * (1 - ratio)).toFixed(1)))
    }
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#16A34A,#15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calculator size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Score Calculator</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Drag sliders — they auto-balance to 100%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Probability sliders */}
        {([
          { key: 'T1'   as const, label: 'Team A Win', val: t1,   color: '#1D4ED8' },
          { key: 'DRAW' as const, label: 'Draw',       val: draw, color: '#64748B' },
          { key: 'T2'   as const, label: 'Team B Win', val: t2,   color: '#D97706' },
        ]).map(({ key, label, val, color }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{label}</label>
              <span style={{ fontSize: 13, fontWeight: 800, color }}>{val.toFixed(1)}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={0.5} value={val}
              onChange={e => setAndBalance(key, parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
            />
          </div>
        ))}

        {!valid && (
          <div style={{ fontSize: 12, color: '#DC2626', background: 'rgba(239,68,68,0.06)', padding: '8px 12px', borderRadius: 8 }}>
            Probabilities must sum to 100% (currently {total.toFixed(1)}%)
          </div>
        )}

        {/* Stage & result selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Stage</label>
            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: 13 }}
            >
              {STAGES.map(s => (
                <option key={s.label} value={s.label}>{s.label} (×{s.weight})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Actual Result</label>
            <select
              value={result}
              onChange={e => setResult(e.target.value as 'T1_WIN' | 'DRAW' | 'T2_WIN')}
              className="input"
              style={{ width: '100%', fontSize: 13 }}
            >
              <option value="T1_WIN">Team A Wins</option>
              <option value="DRAW">Draw</option>
              <option value="T2_WIN">Team B Wins</option>
            </select>
          </div>
        </div>

        {/* Result display */}
        {weightedScore != null && (
          <div style={{
            borderRadius: 14, padding: '20px 24px',
            background: weightedScore > 0 ? 'rgba(22,163,74,0.06)' : weightedScore < -1 ? 'rgba(239,68,68,0.06)' : '#F8FAFC',
            border: `1px solid ${weightedScore > 0 ? 'rgba(22,163,74,0.2)' : weightedScore < -1 ? 'rgba(239,68,68,0.2)' : '#E2E8F0'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 4 }}>Your Score</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: weightedScore > 0 ? '#15803D' : '#DC2626', lineHeight: 1 }}>
                  {fmtScore(weightedScore)}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  {weight > 1 ? (
                    <>
                      <span style={{ color: '#475569' }}>ln(3 × {(prob * 100).toFixed(1)}%) </span>
                      <span style={{ color: '#94A3B8' }}>= {fmtScore(rawScore!)}</span>
                      <span style={{ color: wc.color, fontWeight: 800 }}> × {weight}</span>
                    </>
                  ) : (
                    <span style={{ color: '#475569' }}>ln(3 × {(prob * 100).toFixed(1)}%) = {fmtScore(rawScore!)}</span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 4 }}>Stage</div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: wc.bg, border: `1px solid ${wc.border}`,
                }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>{stage}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: wc.color }}>×{weight}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 12, color: '#64748B' }}>
              {weightedScore > 1 ? '🔥 Excellent! Bold prediction paid off.' :
               weightedScore > 0.3 ? '✅ Solid pick — rewarded for confidence.' :
               weightedScore > 0 ? '😐 Right outcome but you hedged too much.' :
               weightedScore > -1 ? '😬 Small negative — slightly off.' :
               weightedScore > -5 ? '💀 Confident and wrong. Painful.' :
               '☠️ Catastrophic. Never do this in a Final.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Fixed example card ────────────────────────────────────────────────────────
function ExampleCard({ ex }: { ex: FixedExample }) {
  const prob = ex.result === 'T1_WIN' ? ex.t1 : ex.result === 'DRAW' ? ex.draw : ex.t2
  const weight = getStageWeight(ex.stage)
  const raw = calcRaw(prob)
  const weighted = raw * weight
  const wc = WEIGHT_COLORS[weight] ?? WEIGHT_COLORS[1]

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{ex.label}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{ex.desc}</div>
        </div>
        <div style={{
          flexShrink: 0, minWidth: 64, textAlign: 'right',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: weighted > 0 ? '#15803D' : '#DC2626', lineHeight: 1 }}>
            {fmtScore(weighted)}
          </div>
          {weight > 1 && (
            <div style={{ fontSize: 11, color: wc.color, fontWeight: 700 }}>×{weight}</div>
          )}
        </div>
      </div>

      {/* Prob bar */}
      <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', marginBottom: 8, gap: 2 }}>
        <div style={{ width: `${ex.t1 * 100}%`, background: '#1D4ED8', borderRadius: '999px 0 0 999px' }} />
        <div style={{ width: `${ex.draw * 100}%`, background: '#94A3B8' }} />
        <div style={{ width: `${ex.t2 * 100}%`, background: '#D97706', borderRadius: '0 999px 999px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>
        <span style={{ fontWeight: ex.result === 'T1_WIN' ? 800 : 400, color: ex.result === 'T1_WIN' ? '#15803D' : '#94A3B8' }}>
          {Math.round(ex.t1 * 100)}% A {ex.result === 'T1_WIN' ? '✓' : ''}
        </span>
        <span style={{ fontWeight: ex.result === 'DRAW' ? 800 : 400, color: ex.result === 'DRAW' ? '#15803D' : '#94A3B8' }}>
          {Math.round(ex.draw * 100)}% Draw {ex.result === 'DRAW' ? '✓' : ''}
        </span>
        <span style={{ fontWeight: ex.result === 'T2_WIN' ? 800 : 400, color: ex.result === 'T2_WIN' ? '#15803D' : '#94A3B8' }}>
          {Math.round(ex.t2 * 100)}% B {ex.result === 'T2_WIN' ? '✓' : ''}
        </span>
      </div>

      <div style={{
        fontSize: 11, color: '#64748B', background: '#F8FAFC',
        borderRadius: 8, padding: '8px 12px', lineHeight: 1.5,
        borderLeft: `3px solid ${weighted > 0 ? '#16A34A' : '#EF4444'}`,
      }}>
        {ex.note}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#94A3B8' }}>
        <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
          {weight > 1 ? `${weight} × ` : ''}ln(3 × {(prob * 100).toFixed(0)}%) = {fmtScore(raw)}{weight > 1 ? ` × ${weight} = ${fmtScore(weighted)}` : ''}
        </code>
        <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 999, background: wc.bg, color: wc.color, fontWeight: 700 }}>
          {ex.stage} ×{weight}
        </span>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function About() {
  return (
    <div className="space-y-10" style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* ── About hero ── */}
      <div style={{
        borderRadius: 20, background: '#0F172A',
        padding: '44px 48px', overflow: 'hidden', position: 'relative',
        boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, fontSize: 160, opacity: 0.04, pointerEvents: 'none', userSelect: 'none' }}>⚽</div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 14 }}>
          FIFA World Cup 2026
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 14, lineHeight: 1.15 }}>
          For Fun.<br />For Football.<br />For Bragging Rights.
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
          This is a private prediction league for friends and family — a place to
          put your football knowledge on the line across every single match of the
          2026 World Cup. No real money, no stakes, just pure football love and
          the eternal right to say <em style={{ color: '#fff' }}>"I told you so."</em>
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['⚽ Pure football', '🎯 48 teams', '104 matches', '🏆 One champion'].map(tag => (
            <span key={tag} style={{
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.07)', color: '#CBD5E1',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── How scoring works ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#16A34A,#15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8' }}>Scoring System</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>How Your Score Is Calculated</h2>
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Formula */}
          <div style={{
            textAlign: 'center', padding: '24px 16px', marginBottom: 24,
            background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8', marginBottom: 12 }}>The Formula</div>
            <code style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
              Score = Weight × ln(3 × P)
            </code>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 10 }}>
              <strong style={{ color: '#0F172A' }}>P</strong> = the probability (0–1) you assigned to the <em>actual</em> outcome
              &nbsp;·&nbsp; <strong style={{ color: '#0F172A' }}>Weight</strong> = stage multiplier (see below)
            </div>
          </div>

          {/* Key properties */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              {
                icon: '🎯', title: 'Equal split = 0',
                desc: 'Putting 33%/33%/33% means ln(3 × ⅓) = ln(1) = 0. The safe baseline.',
                color: '#64748B',
              },
              {
                icon: '🚀', title: 'Perfect pick = +1.099',
                desc: 'If you put 100% on the right outcome: ln(3 × 1) = ln(3) ≈ 1.099 × weight.',
                color: '#15803D',
              },
              {
                icon: '💀', title: 'Confident & wrong = −∞',
                desc: 'Putting 0% on the correct outcome gives ln(0) = −∞. Avoid this.',
                color: '#DC2626',
              },
            ].map(p => (
              <div key={p.title} style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{p.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, borderLeft: '3px solid #16A34A', paddingLeft: 14 }}>
            <strong style={{ color: '#0F172A' }}>Key insight:</strong> The scoring rewards <em>calibrated confidence</em>.
            If you genuinely think one outcome is 80% likely, put 80% on it — you'll be richly rewarded if right,
            but punished if wrong. Hedging toward equal splits near 33% is the "safe" play that earns you close to 0.
            The real game is having the courage of your convictions.
          </div>
        </div>
      </section>

      {/* ── Default pick policy ── */}
      <div style={{
        borderRadius: 16, padding: '20px 24px',
        background: 'rgba(239,68,68,0.05)', border: '2px solid rgba(239,68,68,0.2)',
        display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#991B1B', marginBottom: 8 }}>
            Always make your pick — or you'll be given an even split
          </div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginBottom: 10 }}>
            If a match kicks off and you haven't submitted a prediction, the system automatically
            records an <strong style={{ color: '#0F172A' }}>even split (34% / 33% / 33%)</strong> on your behalf.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 14px',
          }}>
            <code style={{ fontSize: 13, fontFamily: 'monospace', color: '#64748B' }}>
              ln(3 × ⅓) = ln(1) = <strong style={{ color: '#0F172A' }}>0.000</strong>
            </code>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>— you score exactly zero, regardless of outcome</span>
          </div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginTop: 10 }}>
            Zero sounds harmless, but across many missed matches it adds up to a big gap vs.
            players who made confident correct calls. <strong style={{ color: '#991B1B' }}>Every match counts — don't skip.</strong>
          </p>
        </div>
      </div>

      {/* ── Stage weights ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8' }}>Stage Multipliers</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>It Ain't Over Till the Final</h2>
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 24 }}>
            Every stage carries a multiplier — a <strong style={{ color: '#0F172A' }}>Fibonacci sequence</strong> (1, 2, 3, 5, 8, 13)
            that makes knockout matches increasingly decisive. A single Final
            prediction is worth <strong style={{ color: '#0F172A' }}>13 group stage picks</strong>.
            Someone in last place after the groups can still win it all with a
            few bold late-stage calls.
          </p>

          {/* Weight table */}
          <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
            {STAGES.map(s => {
              const wc = WEIGHT_COLORS[s.weight]
              const maxPossible = s.weight * Math.log(3)
              const worstPossible = s.weight * Math.log(3 * 0.01)
              return (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: wc.bg, border: `1px solid ${wc.border}`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: wc.color }}>×{s.weight}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Perfect pick: <span style={{ color: '#15803D', fontWeight: 700 }}>+{(maxPossible).toFixed(3)}</span>
                      {' '}· Very wrong: <span style={{ color: '#DC2626', fontWeight: 700 }}>{(worstPossible).toFixed(3)}</span>
                    </div>
                  </div>
                  {/* Weight bar */}
                  <div style={{ width: 100, height: 8, background: '#E2E8F0', borderRadius: 999, flexShrink: 0, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      width: `${(s.weight / 13) * 100}%`,
                      background: wc.color,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
            fontSize: 13, color: '#92400E', lineHeight: 1.6,
          }}>
            <strong>⚠️ The Final is everything.</strong> A player who's been average all tournament
            can obliterate the leaderboard with a single well-placed Final prediction —
            or crater themselves with an overconfident one. Group stage comfort is an illusion.
          </div>
        </div>
      </section>

      {/* ── Interactive calculator ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8' }}>Try It</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>See Your Score Before You Submit</h2>
          </div>
        </div>
        <ScoreCalculator />
      </section>

      {/* ── Fixed examples ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#EF4444,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8' }}>Real Examples</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>What Different Picks Look Like</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {FIXED_EXAMPLES.map(ex => <ExampleCard key={ex.label} ex={ex} />)}
        </div>
      </section>

      {/* ── Final note ── */}
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>⚽</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>
          Most Importantly — Have Fun
        </h3>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.8, maxWidth: 500, margin: '0 auto 16px' }}>
          This site was built for the love of football and the joy of watching the
          world's greatest tournament together. Whether you're analysing xG stats at midnight
          or just picking based on which kit looks cooler — you're in.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['🌍 48 countries', '🏟️ 3 host nations', '⚽ 104 matches', '🏆 One winner', '👥 One group chat'].map(t => (
            <span key={t} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999, background: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Contact ── */}
      <div style={{
        borderRadius: 16, padding: '24px 28px',
        background: '#F8FAFC', border: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 20 }}>✉️</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8' }}>Need Help?</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Primary Contacts</h2>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
          For any questions, scoring disputes, or technical issues — reach out to either of the contacts below.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { name: 'Dan Calistrate', email: 'Dan.Calistrate@nrg.com' },
            { name: 'David Babu',     email: 'David.Babu@nrg.com' },
          ].map(c => (
            <a
              key={c.email}
              href={`mailto:${c.email}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 18px', borderRadius: 12, textDecoration: 'none',
                background: '#fff', border: '1px solid #E2E8F0',
                transition: 'border-color 0.15s',
                flex: '1 1 200px',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#16A34A')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#16A34A,#15803D)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, color: '#fff', fontWeight: 800,
              }}>
                {c.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#16A34A' }}>{c.email}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
