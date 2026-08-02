import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import AppShell from './components/AppShell'
import { Navigate, RouteParamsProvider, useLocation } from './router'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Discover = lazy(() => import('./pages/Discover'))
const StartWorkout = lazy(() => import('./pages/StartWorkout'))
const ActiveSession = lazy(() => import('./pages/ActiveSession'))
const Progress = lazy(() => import('./pages/Progress'))
const Records = lazy(() => import('./pages/Records'))
const ExerciseHistory = lazy(() => import('./pages/ExerciseHistory'))
const Settings = lazy(() => import('./pages/Settings'))
const Planner = lazy(() => import('./pages/Planner'))
const Social = lazy(() => import('./pages/Social'))
const Profile = lazy(() => import('./pages/Profile'))

const staticRoutes = {
  '/': Dashboard,
  '/discover': Discover,
  '/start': StartWorkout,
  '/session': ActiveSession,
  '/progress': Progress,
  '/records': Records,
  '/planner': Planner,
  '/social': Social,
  '/profile': Profile,
  '/settings': Settings,
}

const safeDecode = (value) => {
  try { return decodeURIComponent(value) }
  catch { return '' }
}

const resolveRoute = (pathname) => {
  if (staticRoutes[pathname]) return { Page: staticRoutes[pathname], params: {} }
  const profile = pathname.match(/^\/profile\/([^/]+)$/)
  if (profile) return { Page: Profile, params: { profileId: safeDecode(profile[1]) } }
  const exercise = pathname.match(/^\/exercise\/([^/]+)$/)
  if (exercise) return { Page: ExerciseHistory, params: { exerciseId: safeDecode(exercise[1]) } }
  return null
}

function LoadingScreen() {
  return (
    <div className="splash-screen">
      <div className="brand-mark">V</div>
      <p className="eyebrow">Velocity Performance</p>
    </div>
  )
}

function ProtectedApp() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Suspense fallback={<LoadingScreen />}><Login /></Suspense>
  const route = resolveRoute(pathname)
  if (!route) return <Navigate to="/" replace />
  const { Page, params } = route

  return (
    <DataProvider>
      <Suspense fallback={<LoadingScreen />}>
        <RouteParamsProvider params={params}><AppShell><Page /></AppShell></RouteParamsProvider>
      </Suspense>
    </DataProvider>
  )
}

export default function App() {
  return <AuthProvider><ProtectedApp /></AuthProvider>
}
