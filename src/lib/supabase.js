import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
let pendingDatabaseRequests = 0
let usageFlush = null
let appOpenRecorded = false

const trackedFetch = async (input, init) => {
  const response = await fetch(input, init)
  const requestUrl = typeof input === 'string' ? input : input?.url || ''
  const isDatabaseRequest = requestUrl.includes('/rest/v1/')
  const isUsageFlush = requestUrl.includes('/rest/v1/rpc/record_app_usage')
  if (isDatabaseRequest && !isUsageFlush) pendingDatabaseRequests = Math.min(pendingDatabaseRequests + 1, 10000)
  return response
}

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: trackedFetch },
    })
  : null

export const flushUsageMetrics = async ({ appOpen = false } = {}) => {
  if (!supabase || usageFlush) return usageFlush
  const requestCount = pendingDatabaseRequests
  const shouldRecordOpen = appOpen && !appOpenRecorded
  if (!requestCount && !shouldRecordOpen) return null

  pendingDatabaseRequests = 0
  if (shouldRecordOpen) appOpenRecorded = true
  usageFlush = supabase.rpc('record_app_usage', {
    database_request_count: requestCount,
    record_app_open: shouldRecordOpen,
  }).then(({ error }) => {
    if (error) {
      pendingDatabaseRequests = Math.min(pendingDatabaseRequests + requestCount, 10000)
      if (shouldRecordOpen) appOpenRecorded = false
    }
  }).catch(() => {
    pendingDatabaseRequests = Math.min(pendingDatabaseRequests + requestCount, 10000)
    if (shouldRecordOpen) appOpenRecorded = false
  }).finally(() => { usageFlush = null })

  return usageFlush
}
