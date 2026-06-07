const TEAM_CODES: Record<string, string> = {
  // South America
  'Argentina': 'ar', 'Brazil': 'br', 'Uruguay': 'uy', 'Colombia': 'co',
  'Ecuador': 'ec', 'Venezuela': 've', 'Paraguay': 'py', 'Bolivia': 'bo',
  'Chile': 'cl', 'Peru': 'pe',
  // Europe
  'France': 'fr', 'England': 'gb-eng', 'Germany': 'de', 'Spain': 'es',
  'Portugal': 'pt', 'Netherlands': 'nl', 'Italy': 'it', 'Belgium': 'be',
  'Croatia': 'hr', 'Denmark': 'dk', 'Switzerland': 'ch', 'Poland': 'pl',
  'Serbia': 'rs', 'Turkey': 'tr', 'Ukraine': 'ua', 'Austria': 'at',
  'Scotland': 'gb-sct', 'Wales': 'gb-wls', 'Hungary': 'hu', 'Romania': 'ro',
  'Czech Republic': 'cz', 'Czechia': 'cz', 'Slovakia': 'sk', 'Slovenia': 'si',
  'Greece': 'gr', 'Sweden': 'se', 'Norway': 'no', 'Finland': 'fi',
  'Ireland': 'ie', 'Albania': 'al', 'Bosnia & Herzegovina': 'ba',
  'Bosnia and Herzegovina': 'ba', 'North Macedonia': 'mk', 'Kosovo': 'xk',
  'Georgia': 'ge', 'Iceland': 'is', 'Bulgaria': 'bg', 'Montenegro': 'me',
  // CONCACAF
  'USA': 'us', 'Mexico': 'mx', 'Canada': 'ca', 'Costa Rica': 'cr',
  'Honduras': 'hn', 'Jamaica': 'jm', 'Panama': 'pa', 'El Salvador': 'sv',
  'Guatemala': 'gt', 'Trinidad and Tobago': 'tt', 'Haiti': 'ht',
  'Curacao': 'cw', 'Cuba': 'cu',
  // Africa
  'Morocco': 'ma', 'Senegal': 'sn', 'Nigeria': 'ng', 'Ghana': 'gh',
  'Cameroon': 'cm', 'Tunisia': 'tn', 'Egypt': 'eg', 'Algeria': 'dz',
  'South Africa': 'za', 'Mali': 'ml', 'Cape Verde': 'cv',
  "Ivory Coast": 'ci', "Côte d'Ivoire": 'ci', 'DR Congo': 'cd',
  'Congo DR': 'cd', 'Angola': 'ao', 'Benin': 'bj', 'Tanzania': 'tz',
  'Comoros': 'km', 'Rwanda': 'rw', 'Ethiopia': 'et', 'Kenya': 'ke',
  'Zimbabwe': 'zw', 'Uganda': 'ug',
  // Asia
  'Japan': 'jp', 'South Korea': 'kr', 'Australia': 'au', 'Iran': 'ir',
  'Saudi Arabia': 'sa', 'Qatar': 'qa', 'Iraq': 'iq', 'Indonesia': 'id',
  'Bahrain': 'bh', 'Uzbekistan': 'uz', 'Jordan': 'jo', 'Oman': 'om',
  'China': 'cn', 'Thailand': 'th',
  // Oceania / Other
  'New Zealand': 'nz',
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
