const TEAM_CODES: Record<string, string> = {
  'Argentina': 'ar', 'Brazil': 'br', 'France': 'fr', 'England': 'gb-eng',
  'Germany': 'de', 'Spain': 'es', 'Portugal': 'pt', 'Netherlands': 'nl',
  'Italy': 'it', 'Belgium': 'be', 'Croatia': 'hr', 'Morocco': 'ma',
  'USA': 'us', 'Mexico': 'mx', 'Canada': 'ca', 'Japan': 'jp',
  'South Korea': 'kr', 'Australia': 'au', 'Senegal': 'sn', 'Uruguay': 'uy',
  'Colombia': 'co', 'Ecuador': 'ec', 'Ghana': 'gh', 'Nigeria': 'ng',
  'Denmark': 'dk', 'Switzerland': 'ch', 'Poland': 'pl', 'Serbia': 'rs',
  'Cameroon': 'cm', 'Saudi Arabia': 'sa', 'Iran': 'ir', 'Qatar': 'qa',
  'Tunisia': 'tn', 'Egypt': 'eg', 'Algeria': 'dz', 'Chile': 'cl',
  'Peru': 'pe', 'Venezuela': 've', 'Bolivia': 'bo', 'Paraguay': 'py',
  'Costa Rica': 'cr', 'Honduras': 'hn', 'Jamaica': 'jm', 'Panama': 'pa',
  'Turkey': 'tr', 'Ukraine': 'ua', 'Austria': 'at', 'Scotland': 'gb-sct',
  'Wales': 'gb-wls', 'Hungary': 'hu', 'Romania': 'ro', 'Czech Republic': 'cz',
  'Slovakia': 'sk', 'Slovenia': 'si', 'Greece': 'gr', 'Sweden': 'se',
  'Norway': 'no', 'Finland': 'fi', 'Ireland': 'ie', 'Albania': 'al',
  'South Africa': 'za', 'Czechia': 'cz', 'New Zealand': 'nz',
  'Trinidad and Tobago': 'tt', 'Guatemala': 'gt', 'El Salvador': 'sv',
}

interface Props {
  team: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function FlagImage({ team, size = 'md', className = '' }: Props) {
  const code = team ? TEAM_CODES[team] : null
  const px = size === 'sm' ? 20 : size === 'md' ? 32 : 48

  if (!code) {
    return (
      <div
        style={{ width: px * 1.4, height: px, fontSize: px * 0.6 }}
        className={`flex items-center justify-center rounded bg-stadium-800 text-slate-500 font-bold ${className}`}
      >
        {team?.slice(0, 2).toUpperCase() ?? '?'}
      </div>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/w${px * 2}/${code}.png`}
      alt={team ?? ''}
      width={Math.round(px * 1.4)}
      height={px}
      className={`rounded object-cover shadow ${className}`}
      style={{ width: Math.round(px * 1.4), height: px }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}
