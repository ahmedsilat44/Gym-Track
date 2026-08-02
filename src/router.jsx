import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const RouterContext = createContext(null)
const ParamsContext = createContext({})

const normalizePath = (value) => {
  const path = String(value || '/').split('?')[0]
  if (!path.startsWith('/')) throw new Error('Navigation is limited to internal application routes.')
  return path.length > 1 ? path.replace(/\/+$/, '') : '/'
}

const readHashPath = () => {
  try { return normalizePath(window.location.hash.slice(1) || '/') }
  catch { return '/' }
}

export function HashRouter({ children }) {
  const [pathname, setPathname] = useState(readHashPath)

  useEffect(() => {
    const sync = () => setPathname(readHashPath())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  const navigate = useCallback((destination, options = {}) => {
    if (typeof destination === 'number') {
      window.history.go(destination)
      return
    }
    const nextPath = normalizePath(destination)
    if (nextPath === readHashPath() && !options.replace) return
    const nextUrl = `${window.location.pathname}${window.location.search}#${nextPath}`
    window.history[options.replace ? 'replaceState' : 'pushState'](window.history.state, '', nextUrl)
    setPathname(nextPath)
  }, [])

  const value = useMemo(() => ({ pathname, navigate }), [navigate, pathname])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export const useLocation = () => {
  const router = useContext(RouterContext)
  if (!router) throw new Error('useLocation must be used inside HashRouter.')
  return { pathname: router.pathname }
}

export const useNavigate = () => {
  const router = useContext(RouterContext)
  if (!router) throw new Error('useNavigate must be used inside HashRouter.')
  return router.navigate
}

export const useParams = () => useContext(ParamsContext)

export function RouteParamsProvider({ params, children }) {
  return <ParamsContext.Provider value={params}>{children}</ParamsContext.Provider>
}

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate()
  useEffect(() => { navigate(to, { replace }) }, [navigate, replace, to])
  return null
}

export function NavLink({ to, end = false, className, children, onClick, ...props }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const target = normalizePath(to)
  const isActive = end ? pathname === target : pathname === target || pathname.startsWith(`${target}/`)
  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className
  const follow = (event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(target)
  }
  return <a {...props} href={`#${target}`} className={resolvedClassName} aria-current={isActive ? 'page' : undefined} onClick={follow}>{children}</a>
}
