/** Stage multipliers: Group=1, R32=2, R16=3, QF=5, 3rd=6, SF=8, Final=13 */
export function getStageWeight(stage: string | null | undefined): number {
  if (!stage) return 1
  const s = stage.toLowerCase()
  if (s === 'final') return 13
  if (s.includes('semi')) return 8
  if (s.includes('third') || s.includes('3rd')) return 6
  if (s.includes('quarter')) return 5
  if (s.includes('16')) return 3
  if (s.includes('32')) return 2
  return 1
}

/** Score a prediction: weight × ln(3 × probability). Probability must be 0–1. */
export function calcScore(prob: number, stage?: string | null): number {
  if (prob <= 0) return -Infinity
  return getStageWeight(stage) * Math.log(3 * prob)
}

/** Format a score number for display (2 decimal places, or "—" if null). */
export function fmtScore(score: number | null | undefined): string {
  if (score == null || !isFinite(score)) return '—'
  return (score >= 0 ? '+' : '') + score.toFixed(3)
}

/** Format a probability (0–1) as a percentage string. */
export function fmtPct(prob: number): string {
  return (prob * 100).toFixed(1) + '%'
}

/** Format a date for display in CST context. */
export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/** Returns true if the match has already kicked off (locked for predictions). */
export function isLocked(kickoff: string): boolean {
  return new Date(kickoff) <= new Date()
}

/** CSS class combiner (minimal clsx substitute). */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const TEAM_FLAGS: Record<string, string> = {
  'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'France': '🇫🇷', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿','Egypt': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Belgium': '🇧🇪', 'Croatia': '🇭🇷', 'Morocco': '🇲🇦',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'Australia': '🇦🇺', 'Senegal': '🇸🇳', 'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴', 'Ecuador': '🇪🇨', 'Ghana': '🇬🇭', 'Nigeria': '🇳🇬',
  'Denmark': '🇩🇰', 'Switzerland': '🇨🇭', 'Poland': '🇵🇱', 'Serbia': '🇷🇸',
  'Cameroon': '🇨🇲', 'Saudi Arabia': '🇸🇦', 'Iran': '🇮🇷', 'Qatar': '🇶🇦',
  'Tunisia': '🇹🇳', 'Egypt': '🇪🇬', 'Algeria': '🇩🇿', 'Chile': '🇨🇱',
  'Peru': '🇵🇪', 'Venezuela': '🇻🇪', 'Bolivia': '🇧🇴', 'Paraguay': '🇵🇾',
  'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳', 'Jamaica': '🇯🇲', 'Panama': '🇵🇦',
  'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'Austria': '🇦🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Czech Republic': '🇨🇿',
  'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Greece': '🇬🇷', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Albania': '🇦🇱',
  'TBD': '🏳️', 'TBC': '🏳️',
}

export function getFlag(team: string | null | undefined): string {
  if (!team) return '🏳️'
  return TEAM_FLAGS[team] ?? '🏳️'
}

export const FAVORITE_TEAMS = [
  'Argentina', 'Brazil', 'France','Egypt', 'England', 'Germany', 'Spain',
  'Portugal', 'Netherlands', 'Italy', 'Belgium', 'Croatia', 'Morocco',
  'USA', 'Mexico', 'Canada', 'Japan', 'South Korea', 'Australia',
  'Senegal', 'Uruguay', 'Colombia', 'Ecuador', 'Ghana', 'Nigeria',
  'Denmark', 'Switzerland', 'Poland', 'Serbia', 'Cameroon', 'Other'
]
