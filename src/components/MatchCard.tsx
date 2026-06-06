import { Link } from 'react-router-dom'
import { Lock, TrendingUp, Calendar, MapPin } from 'lucide-react'
import { Match, Prediction, MatchResult } from '../types'
import { fmtDate, isLocked, calcScore, fmtScore, getStageWeight } from '../lib/utils'
import FlagImage from './FlagImage'

interface Props {
  match: Match
  prediction?: Prediction | null
  result?: MatchResult | null
  compact?: boolean
}

const STAGE_COLORS: Record<string, string> = {
  'Group Stage':   'badge-slate',
  'Round of 32':   'badge-blue',
  'Round of 16':   'badge-blue',
  'Quarter-Final': 'badge-gold',
  'Semi-Final':    'badge-gold',
  'Third Place':   'badge-gold',
  'Final':         'badge-green',
}

export default function MatchCard({ match, prediction, result, compact }: Props) {
  const locked = match.DateTime_CST ? isLocked(match.DateTime_CST) : false
  const hasPrediction = !!prediction

  const stageWeight = getStageWeight(match.Stage)

  let score: number | null = null
  if (prediction && result) {
    const p = result.result === 'T1_WIN' ? prediction.t1_win_prob
            : result.result === 'DRAW'   ? prediction.draw_prob
            : prediction.t2_win_prob
    score = calcScore(p, match.Stage)
  }

  const topBarColor = result
    ? 'linear-gradient(90deg, #D97706, #F59E0B, #D97706)'
    : locked
    ? '#E2E8F0'
    : hasPrediction
    ? 'linear-gradient(90deg, #16A34A, #22C55E, #16A34A)'
    : 'linear-gradient(90deg, transparent, rgba(22,163,74,0.5), transparent)'

  const cardShadow = result
    ? '0 0 0 1px rgba(245,158,11,0.15), 0 2px 16px rgba(0,0,0,0.06)'
    : hasPrediction
    ? '0 0 0 1px rgba(22,163,74,0.15), 0 2px 16px rgba(0,0,0,0.06)'
    : '0 1px 6px rgba(0,0,0,0.05)'

  return (
    <div
      className="card-hover overflow-hidden"
      style={{ boxShadow: cardShadow }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: topBarColor }} />

      <div className={compact ? 'p-3' : 'p-4'}>
        {/* Stage + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={STAGE_COLORS[match.Stage ?? ''] ?? 'badge-slate'}>
              {match.Stage ?? 'Group Stage'}
            </span>
            {stageWeight > 1 && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999,
                background: stageWeight >= 13 ? 'rgba(234,179,8,0.15)' : stageWeight >= 8 ? 'rgba(168,85,247,0.12)' : stageWeight >= 5 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                color: stageWeight >= 13 ? '#B45309' : stageWeight >= 8 ? '#7C3AED' : stageWeight >= 5 ? '#DC2626' : '#1D4ED8',
                border: `1px solid ${stageWeight >= 13 ? 'rgba(234,179,8,0.3)' : stageWeight >= 8 ? 'rgba(168,85,247,0.25)' : stageWeight >= 5 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
              }}>
                ×{stageWeight}
              </span>
            )}
          </div>
          {result
            ? <span className="badge-gold">✓ Result in</span>
            : locked
            ? <span className="badge-slate" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Lock size={10} /> Locked
              </span>
            : hasPrediction
            ? <span className="badge-green">✓ Predicted</span>
            : <span className="badge-red">Predict Now</span>
          }
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {/* Team A */}
          <div style={{ flex: 1, textAlign: 'right' }}>
            <FlagImage team={match.TeamA} size="md" className="ml-auto mb-2" />
            <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {match.TeamA}
            </div>
          </div>

          {/* Score / VS */}
          <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 56 }}>
            {result ? (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '6px 10px',
              }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
                  {result.score_team_a ?? '?'}
                  <span style={{ color: '#CBD5E1', margin: '0 3px' }}>–</span>
                  {result.score_team_b ?? '?'}
                </span>
              </div>
            ) : (
              <span style={{ color: '#CBD5E1', fontWeight: 700, fontSize: '0.8rem' }}>VS</span>
            )}
          </div>

          {/* Team B */}
          <div style={{ flex: 1 }}>
            <FlagImage team={match.TeamB} size="md" className="mb-2" />
            <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {match.TeamB}
            </div>
          </div>
        </div>

        {/* Result label */}
        {result && (
          <div style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
            padding: '6px 12px',
            borderRadius: 8,
            background: result.result === 'T1_WIN' ? 'rgba(37,99,235,0.08)'
              : result.result === 'DRAW' ? '#F1F5F9'
              : 'rgba(245,158,11,0.1)',
            color: result.result === 'T1_WIN' ? '#2563EB'
              : result.result === 'DRAW' ? '#64748B'
              : '#B45309',
          }}>
            {result.result === 'T1_WIN' ? `${match.TeamA} Win`
            : result.result === 'T2_WIN' ? `${match.TeamB} Win`
            : '🤝 Draw'}
          </div>
        )}

        {/* Prediction bar */}
        {prediction && (
          <div style={{ marginBottom: 12 }}>
            <div className="prob-bar" style={{ marginBottom: 6 }}>
              <div style={{
                background: 'linear-gradient(90deg, #1D4ED8, #3B82F6)',
                borderRadius: '999px 0 0 999px',
                width: `${prediction.t1_win_prob * 100}%`,
                transition: 'width 0.4s ease',
              }} />
              <div style={{
                background: '#94A3B8',
                width: `${prediction.draw_prob * 100}%`,
                transition: 'width 0.4s ease',
              }} />
              <div style={{
                background: 'linear-gradient(90deg, #D97706, #F59E0B)',
                borderRadius: '0 999px 999px 0',
                width: `${prediction.t2_win_prob * 100}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8' }}>
              <span>{Math.round(prediction.t1_win_prob * 100)}%</span>
              <span>{Math.round(prediction.draw_prob * 100)}% Draw</span>
              <span>{Math.round(prediction.t2_win_prob * 100)}%</span>
            </div>
            {score !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 8, fontSize: '0.85rem', fontWeight: 700,
                color: score >= 0 ? '#15803D' : '#DC2626',
              }}>
                <TrendingUp size={13} />
                Score: {fmtScore(score)}
              </div>
            )}
          </div>
        )}

        {/* Date + venue */}
        {!compact && match.DateTime_CST && (
          <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#94A3B8', marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />{fmtDate(match.DateTime_CST)}
            </span>
            {match.Venue && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MapPin size={11} />{match.Venue}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <Link
          to={`/predict/${match.MatchNo}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '8px 16px', borderRadius: 10,
            fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            transition: 'all 0.2s ease',
            ...(locked
              ? { background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0' }
              : hasPrediction
              ? { background: 'rgba(22,163,74,0.08)', color: '#15803D', border: '1px solid rgba(22,163,74,0.2)' }
              : { background: 'linear-gradient(135deg,#16A34A,#15803D)', color: '#fff', boxShadow: '0 2px 14px rgba(22,163,74,0.35)' }
            )
          }}
        >
          {locked ? 'View Details' : hasPrediction ? '✏️ Edit Prediction' : '⚡ Predict Now'}
        </Link>
      </div>
    </div>
  )
}
