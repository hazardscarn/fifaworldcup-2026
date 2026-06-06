import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#EDF0F7' }}>
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer style={{
        textAlign: 'center', fontSize: 12, color: '#94A3B8',
        padding: '16px', borderTop: '1px solid #E2E8F0',
        background: '#fff',
      }}>
        ⚽ FIFA World Cup 2026 Predictor · © {new Date().getFullYear()} EdenLabs
      </footer>
    </div>
  )
}
