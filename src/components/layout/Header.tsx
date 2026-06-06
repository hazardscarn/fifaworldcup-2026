import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Home, BarChart2, Calendar, Trophy, Info, LogOut, User, Shield, Menu, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import { trophyIcon } from '../../lib/images'

const navLinks = [
  { to: '/',            label: 'Home',        icon: Home,     exact: true },
  { to: '/dashboard',   label: 'Dashboard',   icon: BarChart2, exact: false },
  { to: '/schedule',    label: 'Schedule',    icon: Calendar,  exact: false },
  { to: '/leaderboard', label: 'Standings',   icon: Trophy,    exact: false },
  { to: '/about',       label: 'About',       icon: Info,      exact: false },
]

export default function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-slate-200"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <img
            src={trophyIcon}
            alt="FIFA 2026"
            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
          />
          <div className="hidden sm:block leading-tight">
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#16A34A' }}>
              FIFA World Cup
            </div>
            <div style={{ fontWeight: 900, color: '#0F172A', fontSize: 17, lineHeight: 1 }}>
              2026 <span style={{ color: '#16A34A' }}>Predictor</span>
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                )
              }
            >
              <Shield size={15} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-green-300 hover:bg-green-50 transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
              <User size={13} className="text-green-700" />
            </div>
            <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">
              {profile?.display_name}
            </span>
          </Link>

          <button
            onClick={handleSignOut}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all duration-200"
          >
            <LogOut size={14} />
            Logout
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 px-4 py-3 space-y-1 animate-slide-up">
          {navLinks.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn('flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold', isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600')
              }
            >
              <Shield size={16} /> Admin
            </NavLink>
          )}
          <div className="border-t border-slate-200 pt-2 mt-2 flex flex-col gap-1">
            <Link to="/profile" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-slate-600">
              <User size={16} /> {profile?.display_name}
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-red-500 text-left">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
