import { useState } from 'react'
import { allStars1, mbappeYamal, messiFCR7, messVsCr7 } from '../lib/images'

const PANELS = [
  { src: messVsCr7,   label: 'Messi vs CR7' },
  { src: messiFCR7,   label: 'The GOATs' },
  { src: mbappeYamal, label: 'Next Gen' },
  { src: allStars1,   label: 'World Stars' },
]

interface Props {
  height?: number
}

export default function PlayerStrip({ height = 150 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div style={{
      display: 'flex',
      height,
      gap: 4,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}>
      {PANELS.map((panel, i) => (
        <div
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            flex: hovered === i ? 3 : 1,
            backgroundImage: `url(${panel.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            transition: 'flex 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: hovered === i ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.35)',
            transition: 'background 0.45s ease',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '20px 12px 10px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
            opacity: hovered === i ? 1 : 0,
            transform: hovered === i ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}>
              {panel.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
