import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B0F1A' }}>
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer style={{
        textAlign: 'center', fontSize: 12, color: 'rgba(148,163,184,0.55)',
        padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#080C14',
      }}>
        ⚽ FIFA World Cup 2026 Predictor · © {new Date().getFullYear()} EdenLabs
      </footer>
    </div>
  )
}
