import { ProbabilityTriple } from '../types'
import { calcScore, fmtScore } from '../lib/utils'

interface Props {
  teamA: string
  teamB: string
  value: ProbabilityTriple
  onChange: (val: ProbabilityTriple) => void
  disabled?: boolean
}

const OUTCOMES = (teamA: string, teamB: string) => [
  { key: 't1'   as const, label: teamA,  borderColor: '#3B82F6', labelColor: '#1D4ED8', barBg: '#3B82F6' },
  { key: 'draw' as const, label: 'Draw',  borderColor: '#94A3B8', labelColor: '#64748B', barBg: '#94A3B8' },
  { key: 't2'   as const, label: teamB,  borderColor: '#F59E0B', labelColor: '#B45309', barBg: '#F59E0B' },
]

export default function ProbabilityInput({ teamA, teamB, value, onChange, disabled }: Props) {
  const sum = value.t1 + value.draw + value.t2
  const valid = sum === 100

  function handleChange(field: keyof ProbabilityTriple, raw: string) {
    const n = Math.min(98, Math.max(1, parseInt(raw, 10) || 1))
    onChange({ ...value, [field]: n })
  }

  const outcomes = OUTCOMES(teamA, teamB)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Visual probability bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          <span style={{ color: '#1D4ED8' }}>{teamA}</span>
          <span style={{ color: '#64748B' }}>DRAW</span>
          <span style={{ color: '#B45309' }}>{teamB}</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex', gap: 2, background: '#F1F5F9' }}>
          <div style={{ width: `${value.t1}%`, background: '#3B82F6', borderRadius: '999px 0 0 999px', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${value.draw}%`, background: '#94A3B8', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${value.t2}%`, background: '#F59E0B', borderRadius: '0 999px 999px 0', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
          <span>{value.t1}%</span>
          <span>{value.draw}%</span>
          <span>{value.t2}%</span>
        </div>
      </div>

      {/* Input cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {outcomes.map(({ key, label, borderColor, labelColor }) => {
          const prob = value[key] / 100
          const preview = calcScore(prob)
          const isLow = value[key] < 5

          return (
            <div key={key} style={{
              borderRadius: 16, border: `2px solid ${isLow && !disabled ? '#FCA5A5' : disabled ? '#E2E8F0' : borderColor + '55'}`,
              padding: '14px 10px', textAlign: 'center',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              opacity: disabled ? 0.6 : 1,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: labelColor, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </div>

              <div style={{ position: 'relative', marginBottom: 10 }}>
                <input
                  type="number"
                  min={1}
                  max={98}
                  value={value[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  disabled={disabled}
                  style={{
                    width: '100%',
                    padding: '8px 28px 8px 8px',
                    textAlign: 'center',
                    fontSize: 28,
                    fontWeight: 900,
                    color: isLow && !disabled ? '#EF4444' : '#0F172A',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    outline: 'none',
                    cursor: disabled ? 'not-allowed' : 'text',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 14, fontWeight: 700, color: labelColor, pointerEvents: 'none',
                }}>%</span>
              </div>

              <div style={{
                fontSize: 13, fontWeight: 700,
                color: preview >= 0.5 ? '#15803D' : preview >= 0 ? '#64748B' : '#DC2626',
              }}>
                {value[key] >= 1 ? fmtScore(preview) : '—'}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>if correct</div>
            </div>
          )
        })}
      </div>

      {/* Sum indicator + even split */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: '1px solid',
          background: valid ? 'rgba(22,163,74,0.07)' : sum > 100 ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
          color: valid ? '#15803D' : sum > 100 ? '#DC2626' : '#B45309',
          borderColor: valid ? 'rgba(22,163,74,0.25)' : sum > 100 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)',
        }}>
          {valid ? '✓' : '⚠️'} Total: {sum}%
          {!valid && (
            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>
              {sum > 100 ? `(${sum - 100} over)` : `(${100 - sum} remaining)`}
            </span>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange({ t1: 34, draw: 33, t2: 33 })}
            style={{
              fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
              background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B',
            }}
          >
            Even split
          </button>
        )}
      </div>

      {!valid && !disabled && (
        <p style={{ fontSize: 12, color: '#B45309', textAlign: 'center' }}>
          Probabilities must sum to exactly 100% to submit.
        </p>
      )}

      <div style={{
        fontSize: 12, color: '#94A3B8', background: '#F8FAFC',
        border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '10px 16px', textAlign: 'center',
      }}>
        Score = ln(3 × P) · Equal = 0 · Perfect = +1.099 · Confident wrong = negative
      </div>
    </div>
  )
}
