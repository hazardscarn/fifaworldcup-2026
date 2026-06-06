import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Lock, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Match, Prediction, MatchResult, PredictionScore, ProbabilityTriple } from '../types'
import ProbabilityInput from '../components/ProbabilityInput'
import { fmtDate, isLocked, fmtScore, fmtPct, cn, getFlag } from '../lib/utils'

export default function Predict() {
  const { matchNo } = useParams<{ matchNo: string }>()
  const { user } = useAuth()

  const [match, setMatch] = useState<Match | null>(null)
  const [myPrediction, setMyPrediction] = useState<Prediction | null>(null)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [otherPredictions, setOtherPredictions] = useState<PredictionScore[]>([])
  const [probs, setProbs] = useState<ProbabilityTriple>({ t1: 34, draw: 33, t2: 33 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const locked = match?.DateTime_CST ? isLocked(match.DateTime_CST) : false
  const valid = probs.t1 + probs.draw + probs.t2 === 100

  useEffect(() => {
    if (!matchNo || !user) return
    async function load() {
      const no = parseInt(matchNo!, 10)
      const [matchRes, predRes, resultRes] = await Promise.all([
        supabase.from('worldcup_schedule').select('*').eq('MatchNo', no).single(),
        supabase.from('predictions').select('*').eq('user_id', user!.id).eq('match_no', no).maybeSingle(),
        supabase.from('match_results').select('*').eq('match_no', no).maybeSingle(),
      ])

      setMatch(matchRes.data ?? null)
      setResult(resultRes.data ?? null)

      if (predRes.data) {
        setMyPrediction(predRes.data)
        setProbs({
          t1: Math.round(predRes.data.t1_win_prob * 100),
          draw: Math.round(predRes.data.draw_prob * 100),
          t2: Math.round(predRes.data.t2_win_prob * 100),
        })
      }

      // Load others' predictions only after kickoff (or always show if result exists)
      if (matchRes.data?.DateTime_CST && isLocked(matchRes.data.DateTime_CST)) {
        const othersRes = await supabase
          .from('prediction_scores')
          .select('*')
          .eq('match_no', no)
          .order('score', { ascending: false, nullsFirst: false })
        setOtherPredictions(othersRes.data ?? [])
      }

      setLoading(false)
    }
    load()
  }, [matchNo, user])

  async function handleSubmit() {
    if (!user || !match || !valid) return
    setSaving(true)
    setSaveMsg(null)

    const payload = {
      user_id: user.id,
      match_no: match.MatchNo,
      t1_win_prob: probs.t1 / 100,
      draw_prob: probs.draw / 100,
      t2_win_prob: probs.t2 / 100,
    }

    const { error } = myPrediction
      ? await supabase.from('predictions').update(payload).eq('id', myPrediction.id)
      : await supabase.from('predictions').insert(payload)

    setSaving(false)
    if (error) {
      setSaveMsg({ type: 'error', text: error.message })
    } else {
      setSaveMsg({ type: 'success', text: myPrediction ? 'Prediction updated!' : 'Prediction saved!' })
      // Refresh own prediction
      const { data } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_no', match.MatchNo)
        .single()
      setMyPrediction(data)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Match not found.</p>
        <Link to="/schedule" className="text-pitch-500 hover:underline text-sm mt-2 block">
          ← Back to schedule
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link to="/schedule" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to schedule
      </Link>

      {/* Match header */}
      <div className="card p-6"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(34,197,94,0.08) 0%, transparent 60%), #0D1B2A' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="badge-slate">{match.Stage ?? 'Group Stage'}</span>
          <span className="text-slate-600 text-sm font-mono">Match #{match.MatchNo}</span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 text-right">
            <div className="text-4xl mb-1">{getFlag(match.TeamA)}</div>
            <div className="text-xl font-black text-white uppercase tracking-tight">{match.TeamA}</div>
          </div>
          <div className="text-stadium-600 font-bold text-sm px-4">VS</div>
          <div className="flex-1">
            <div className="text-4xl mb-1">{getFlag(match.TeamB)}</div>
            <div className="text-xl font-black text-white uppercase tracking-tight">{match.TeamB}</div>
          </div>
        </div>

        {result && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-6 py-3">
              <span className="text-3xl font-bold text-white">{result.score_team_a ?? '?'}</span>
              <span className="text-slate-500">–</span>
              <span className="text-3xl font-bold text-white">{result.score_team_b ?? '?'}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-500">
          {match.DateTime_CST && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {fmtDate(match.DateTime_CST)}
            </span>
          )}
          {match.Venue && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {match.Venue}
            </span>
          )}
        </div>
      </div>

      {/* Result indicator */}
      {result && (
        <div className={cn(
          'rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2',
          result.result === 'T1_WIN' ? 'bg-blue-500/20 text-blue-300'
          : result.result === 'DRAW'  ? 'bg-slate-600/50 text-slate-300'
          : 'bg-amber-500/20 text-amber-300'
        )}>
          <span className="text-lg">🏆</span>
          {result.result === 'T1_WIN' ? `${match.TeamA} won`
          : result.result === 'T2_WIN' ? `${match.TeamB} won`
          : 'This match was a draw'}
          {myPrediction && (
            <span className="ml-auto font-bold text-base">
              Your score:{' '}
              {fmtScore(
                result.result === 'T1_WIN' ? Math.log(3 * myPrediction.t1_win_prob)
                : result.result === 'DRAW' ? Math.log(3 * myPrediction.draw_prob)
                : Math.log(3 * myPrediction.t2_win_prob)
              )}
            </span>
          )}
        </div>
      )}

      {/* Prediction form */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">
            {myPrediction ? 'Your Prediction' : 'Make Your Prediction'}
          </h2>
          {locked && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock size={13} /> Locked — match has started
            </span>
          )}
        </div>

        <ProbabilityInput
          teamA={match.TeamA ?? 'Team A'}
          teamB={match.TeamB ?? 'Team B'}
          value={probs}
          onChange={setProbs}
          disabled={locked}
        />

        {!locked && (
          <>
            <button
              onClick={handleSubmit}
              disabled={!valid || saving}
              className="btn-primary w-full"
            >
              {saving ? 'Saving…' : myPrediction ? 'Update Prediction' : 'Submit Prediction'}
            </button>

            {saveMsg && (
              <p className={cn(
                'text-sm rounded-lg px-3 py-2 text-center',
                saveMsg.type === 'success'
                  ? 'bg-pitch-500/10 text-pitch-500'
                  : 'bg-red-500/10 text-red-400'
              )}>
                {saveMsg.text}
              </p>
            )}
          </>
        )}
      </div>

      {/* Others' predictions (only after match started) */}
      {locked && otherPredictions.length > 0 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <h2 className="font-semibold text-white">All Predictions</h2>
            <span className="badge-slate ml-auto">{otherPredictions.length} players</span>
          </div>

          <div className="space-y-2">
            {otherPredictions.map(p => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                  p.user_id === user?.id ? 'bg-pitch-500/10 border border-pitch-500/30' : 'bg-slate-800/60'
                )}
              >
                <div className="w-28 truncate font-medium text-white">{p.display_name}</div>
                <div className="flex-1 flex items-center gap-0.5 min-w-0">
                  <div
                    className="h-1.5 rounded-l-full bg-blue-500"
                    style={{ width: `${p.t1_win_prob * 100}%` }}
                  />
                  <div
                    className="h-1.5 bg-slate-500"
                    style={{ width: `${p.draw_prob * 100}%` }}
                  />
                  <div
                    className="h-1.5 rounded-r-full bg-amber-500"
                    style={{ width: `${p.t2_win_prob * 100}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 shrink-0 w-20 text-right">
                  {fmtPct(p.t1_win_prob)} / {fmtPct(p.draw_prob)} / {fmtPct(p.t2_win_prob)}
                </div>
                <div className={cn(
                  'w-14 text-right font-bold text-sm shrink-0',
                  p.score == null ? 'text-slate-500'
                  : p.score >= 0 ? 'text-pitch-500'
                  : 'text-red-400'
                )}>
                  {fmtScore(p.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
