import { CalendarDays, Dumbbell, Gauge, House, Settings, Users } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const navItems = [
  ['/', House, 'Home'],
  ['/planner', CalendarDays, 'Planner'],
  ['/social', Users, 'Social'],
  ['/progress', Gauge, 'Progress'],
  ['/settings', Settings, 'Settings'],
]

export default function AppShell({ children }) {
  const { isDemo } = useAuth()
  const { activeWorkout, error } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const isSession = location.pathname === '/session'

  return (
    <div className="app-shell">
      {isDemo && !isSession && <div className="demo-banner">Demo mode · connect Supabase in <button onClick={() => navigate('/settings')}>Settings</button></div>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="page-frame">{children}</div>
      {activeWorkout && !isSession && (
        <button className="resume-workout" onClick={() => navigate('/session')}>
          <span className="resume-icon"><Dumbbell size={18} /></span>
          <span><strong>Workout in progress</strong><small>Tap to resume your session</small></span>
        </button>
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map(([path, Icon, label]) => (
          <NavLink key={path} to={path} end={path === '/'} aria-label={label} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Icon size={23} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
