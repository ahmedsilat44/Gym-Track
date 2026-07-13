import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import AppShell from './components/AppShell'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Discover = lazy(() => import('./pages/Discover'))
const StartWorkout = lazy(() => import('./pages/StartWorkout'))
const ActiveSession = lazy(() => import('./pages/ActiveSession'))
const Progress = lazy(() => import('./pages/Progress'))
const ExerciseHistory = lazy(() => import('./pages/ExerciseHistory'))
const Settings = lazy(() => import('./pages/Settings'))
const Planner = lazy(() => import('./pages/Planner'))
const Social = lazy(() => import('./pages/Social'))
const Profile = lazy(() => import('./pages/Profile'))

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
  if (loading) return <LoadingScreen />
  if (!user) return <Suspense fallback={<LoadingScreen />}><Login /></Suspense>

  return (
    <DataProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<AppShell><Outlet /></AppShell>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/start" element={<StartWorkout />} />
            <Route path="/session" element={<ActiveSession />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/social" element={<Social />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:profileId" element={<Profile />} />
            <Route path="/exercise/:exerciseId" element={<ExerciseHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </DataProvider>
  )
}

export default function App() {
  return <AuthProvider><ProtectedApp /></AuthProvider>
}
