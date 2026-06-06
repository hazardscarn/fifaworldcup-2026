import { FormEvent, useEffect, useState } from 'react'
import { User, TrendingUp, Target, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { PredictionScore } from '../types'
import { fmtScore, fmtPct, fmtDate, cn, FAVORITE_TEAMS } from '../lib/utils'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()

  const [myScores, setMyScores] = useState<PredictionScore[]>([])
  const [loadingScores, setLoadingScores] = useState(true)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [favoriteTeam, setFavoriteTeam] = useState(profile?.favorite_team ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('kickoff', { ascending: false })
      .then(({ data }) => {
        setMyScores(data ?? [])
        setLoadingScores(false)
      })
  }, [user])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName, favorite_team: favoriteTeam })
      .eq('user_id', user.id)
    setSaving(false)
    if (error) setSaveMsg('Error: ' + error.message)
    else {
      setSaveMsg('Saved!')
      await refreshProfile()
    }
  }

  const scored = myScores.filter(s => s.score !== null)
  const totalScore = scored.reduce((sum, s) => sum + (s.score ?? 0), 0)
  const avgScore = scored.length > 0 ? totalScore / scored.length : null

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-pitch-500/20 flex items-center justify-center">
          <User size={24} className="text-pitch-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{profile?.display_name}</h1>
          <p className="text-slate-400 text-sm">@{profile?.username}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white">{myScores.length}</div>
          <div className="text-xs text-slate-400 mt-1">Predictions</div>
        </div>
        <div className="card p-4 text-center">
          <div className={cn('text-2xl font-bold', totalScore >= 0 ? 'text-pitch-500' : 'text-red-400')}>
            {scored.length > 0 ? fmtScore(totalScore) : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Total Score</div>
        </div>
        <div className="card p-4 text-center">
          <div className={cn('text-2xl font-bold', (avgScore ?? 0) >= 0 ? 'text-pitch-500' : 'text-red-400')}>
            {avgScore != null ? fmtScore(avgScore) : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Avg Score</div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-4">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Favorite Team</label>
            <select
              className="input"
              value={favoriteTeam}
              onChange={e => setFavoriteTeam(e.target.value)}
            >
              {FAVORITE_TEAMS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saveMsg && (
              <span className="text-sm text-pitch-500">{saveMsg}</span>
            )}
          </div>
        </form>
      </div>

      {/* Prediction history */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-4">My Predictions</h2>
        {loadingScores ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myScores.length === 0 ? (
          <p className="text-slate-500 text-sm">No predictions yet.</p>
        ) : (
          <div className="space-y-2">
            {myScores.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {s.team_a} vs {s.team_b}
                  </div>
                  <div className="text-xs text-slate-500">{fmtDate(s.kickoff)}</div>
                </div>

                {/* Probability bar */}
                <div className="hidden sm:flex items-center gap-0.5 w-28">
                  <div className="h-1.5 rounded-l-full bg-blue-500" style={{ width: `${s.t1_win_prob * 100}%` }} />
                  <div className="h-1.5 bg-slate-500" style={{ width: `${s.draw_prob * 100}%` }} />
                  <div className="h-1.5 rounded-r-full bg-amber-500" style={{ width: `${s.t2_win_prob * 100}%` }} />
                </div>
                <div className="text-xs text-slate-500 w-20 text-right hidden sm:block">
                  {fmtPct(s.t1_win_prob)} / {fmtPct(s.draw_prob)} / {fmtPct(s.t2_win_prob)}
                </div>

                {/* Result + score */}
                {s.result ? (
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400 mb-0.5">
                      {s.result === 'T1_WIN' ? s.team_a + ' won'
                      : s.result === 'T2_WIN' ? s.team_b + ' won'
                      : 'Draw'}
                    </div>
                    <div className={cn(
                      'font-bold text-sm',
                      (s.score ?? 0) >= 0 ? 'text-pitch-500' : 'text-red-400'
                    )}>
                      {fmtScore(s.score)}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 shrink-0">Awaiting result</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
