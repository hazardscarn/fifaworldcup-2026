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
  // South America
  'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'Uruguay': '🇺🇾', 'Colombia': '🇨🇴',
  'Ecuador': '🇪🇨', 'Venezuela': '🇻🇪', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴',
  'Chile': '🇨🇱', 'Peru': '🇵🇪',
  // Europe — England/Scotland/Wales use 🇬🇧 (tag-sequence emojis don't render on Windows)
  'France': '🇫🇷', 'England': '🇬🇧', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Croatia': '🇭🇷', 'Denmark': '🇩🇰',
  'Switzerland': '🇨🇭', 'Poland': '🇵🇱', 'Serbia': '🇷🇸', 'Turkey': '🇹🇷',
  'Ukraine': '🇺🇦', 'Austria': '🇦🇹', 'Scotland': '🇬🇧', 'Wales': '🇬🇧',
  'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮',
  'Albania': '🇦🇱', 'Georgia': '🇬🇪', 'Bosnia & Herzegovina': '🇧🇦',
  // Africa
  'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Tunisia': '🇹🇳', 'Egypt': '🇪🇬', 'Algeria': '🇩🇿',
  'South Africa': '🇿🇦', 'Mali': '🇲🇱', 'Cape Verde': '🇨🇻',
  'Ivory Coast': '🇨🇮', 'DR Congo': '🇨🇩', 'Angola': '🇦🇴',
  // CONCACAF
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'Costa Rica': '🇨🇷',
  'Honduras': '🇭🇳', 'Jamaica': '🇯🇲', 'Panama': '🇵🇦', 'Haiti': '🇭🇹',
  'El Salvador': '🇸🇻', 'Cuba': '🇨🇺', 'Curacao': '🇨🇼',
  'Trinidad and Tobago': '🇹🇹',
  // Asia / Oceania
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺', 'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦', 'Iraq': '🇮🇶', 'Indonesia': '🇮🇩', 'Bahrain': '🇧🇭',
  'Uzbekistan': '🇺🇿', 'Jordan': '🇯🇴', 'New Zealand': '🇳🇿',
  'TBD': '🏳️', 'TBC': '🏳️',
}

export function getFlag(team: string | null | undefined): string {
  if (!team) return '🏳️'
  return TEAM_FLAGS[team] ?? '🏳️'
}

export const FAVORITE_TEAMS = [
  // Africa
  'Algeria', 'Angola', 'Cameroon', 'Cape Verde', 'DR Congo',
  'Egypt', 'Ghana', 'Ivory Coast', 'Mali', 'Morocco',
  'Nigeria', 'Senegal', 'South Africa', 'Tunisia',
  // Asia / Oceania
  'Australia', 'Bahrain', 'Indonesia', 'Iran', 'Iraq',
  'Japan', 'Jordan', 'New Zealand', 'Saudi Arabia', 'South Korea',
  'Uzbekistan',
  // CONCACAF
  'Canada', 'Costa Rica', 'Cuba', 'Curacao', 'El Salvador',
  'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Panama',
  'Trinidad and Tobago', 'USA',
  // Europe
  'Albania', 'Austria', 'Bosnia & Herzegovina', 'Croatia', 'Denmark',
  'England', 'France', 'Georgia', 'Germany', 'Hungary',
  'Netherlands', 'Poland', 'Portugal', 'Romania', 'Scotland',
  'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Switzerland',
  'Turkey', 'Ukraine',
  // South America
  'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia',
  'Ecuador', 'Paraguay', 'Peru', 'Uruguay', 'Venezuela',
  'Other',
]
