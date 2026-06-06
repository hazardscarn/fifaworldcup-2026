import { useState, useEffect } from 'react'
import {
  neymar, haaland, kane, kdb, james, wirtzMusiala,
  dembele, pulisic, vandijk, caicedo, enzo, alfonsoDavis,
} from '../lib/images'

const PLAYERS = [
  { src: neymar,       name: 'Neymar Jr',       country: 'Brazil' },
  { src: haaland,      name: 'Haaland',          country: 'Norway' },
  { src: kane,         name: 'Harry Kane',       country: 'England' },
  { src: kdb,          name: 'De Bruyne',        country: 'Belgium' },
  { src: james,        name: 'Reece James',       country: 'England' },
  { src: wirtzMusiala, name: 'Wirtz & Musiala',  country: 'Germany' },
  { src: dembele,      name: 'Dembélé',          country: 'France' },
  { src: pulisic,      name: 'Pulisic',          country: 'USA' },
  { src: vandijk,      name: 'Van Dijk',         country: 'Netherlands' },
  { src: caicedo,      name: 'Caicedo',          country: 'Ecuador' },
  { src: enzo,         name: 'Enzo Fernández',   country: 'Argentina' },
  { src: alfonsoDavis, name: 'Alfonso Davies',   country: 'Canada' },
]

interface Props {
  width?: number
  /** Pass true when the parent has an explicit height (e.g. sticky wrapper). Omit to rely on flex stretch. */
  fillHeight?: boolean
}

export default function PlayerCarousel({ width = 190, fillHeight = false }: Props) {
  const [current, setCurrent]   = useState(0)
  const [fading,  setFading]    = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % PLAYERS.length)
        setFading(false)
      }, 380)
    }, 3800)
    return () => clearInterval(timer)
  }, [])

  const player = PLAYERS[current]

  return (
    <div
      className="hidden xl:block"
      style={{
        width,
        flexShrink: 0,
        ...(fillHeight ? { height: '100%' } : {}),
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      }}
    >
      {/* Player image — fills the entire container */}
      <img
        src={player.src}
        alt={player.name}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.38s ease',
        }}
      />

      {/* Right-side fade so it blends into the light page bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to left, transparent 55%, rgba(237,240,247,0.88) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top progress bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: 'rgba(0,0,0,0.18)',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #22C55E, #16A34A)',
          width: `${((current + 1) / PLAYERS.length) * 100}%`,
          transition: 'width 0.4s ease',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      {/* Dot indicators */}
      <div style={{
        position: 'absolute', top: 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap',
        padding: '0 8px',
      }}>
        {PLAYERS.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 14 : 5,
              height: 5,
              borderRadius: 999,
              background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: i === current ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Bottom label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '36px 14px 16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 900, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2,
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        }}>
          {player.name}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(255,255,255,0.65)',
          marginTop: 3,
          letterSpacing: '0.04em',
        }}>
          {player.country}
        </div>
      </div>
    </div>
  )
}
