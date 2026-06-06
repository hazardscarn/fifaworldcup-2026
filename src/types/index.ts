export interface UserProfile {
  user_id: string
  username: string
  display_name: string
  email: string | null
  first_name: string | null
  last_name: string | null
  favorite_team: string | null
  is_admin: boolean
}

export interface Match {
  MatchNo: number
  Stage: string | null
  DateTime_CST: string | null
  Fixture: string | null
  TeamA: string | null
  TeamB: string | null
  Venue: string | null
}

export interface Prediction {
  id: string
  user_id: string
  match_no: number
  t1_win_prob: number
  draw_prob: number
  t2_win_prob: number
  created_at: string
  updated_at: string
}

export interface MatchResult {
  match_no: number
  result: 'T1_WIN' | 'DRAW' | 'T2_WIN'
  score_team_a: number | null
  score_team_b: number | null
  entered_by: string | null
  created_at: string
}

export interface PredictionScore {
  id: string
  user_id: string
  username: string
  display_name: string
  favorite_team: string | null
  match_no: number
  team_a: string
  team_b: string
  stage: string
  kickoff: string
  t1_win_prob: number
  draw_prob: number
  t2_win_prob: number
  result: 'T1_WIN' | 'DRAW' | 'T2_WIN' | null
  score_team_a: number | null
  score_team_b: number | null
  score: number | null
  updated_at: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  display_name: string
  favorite_team: string | null
  predictions_made: number
  matches_scored: number
  total_score: number
  avg_score: number | null
  rank: number
}

export type ProbabilityTriple = {
  t1: number   // 0–100 (integer percent)
  draw: number
  t2: number
}
