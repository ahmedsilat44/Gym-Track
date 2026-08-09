import { isSupabaseConfigured, supabase } from './supabase'

export const publicFeatureStatuses = ['approved', 'planned', 'completed']

export const featureStatusLabel = (status) => ({
  approved: 'Open',
  planned: 'Planned',
  completed: 'Shipped',
  pending: 'Pending',
  rejected: 'Rejected',
}[status] || status)

export async function listPublicFeatureRequests() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_public_feature_requests')
  if (error) throw error
  return data || []
}

export async function submitFeatureRequest({ title, description, name, email }) {
  if (!isSupabaseConfigured) throw new Error('Connect Supabase before accepting feature requests.')
  const { error } = await supabase.rpc('submit_feature_request', {
    request_title: title,
    request_description: description,
    request_submitter_name: name,
    request_submitter_email: email,
  })
  if (error) throw error
}

export async function listAdminFeatureRequests() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_list_feature_requests')
  if (error) throw error
  return data || []
}

export async function setFeatureRequestStatus(requestId, status) {
  if (!supabase) return
  const { error } = await supabase.rpc('admin_set_feature_request_status', {
    target_request_id: requestId,
    new_status: status,
  })
  if (error) throw error
}
