// The extension's only network surface: requests to the one configured node
// (spec §9.7.4). Every call returns an outcome, never throws, so callers
// render each case without a try. `fetch_impl` is injectable for tests.

const outcome_of = async (response) => {
  if (response.status === 401) return { kind: 'unauthorized' }
  let body
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  if (response.ok) return { kind: 'ok', status: response.status, data: body }
  const error = body?.error ?? {}
  // The node refuses an Origin outside its cors_origins with this message.
  if (response.status === 403 && String(error.message ?? '').startsWith('origin not allowed')) return { kind: 'origin_refused' }
  return { kind: 'error', status: response.status, code: error.code ?? 'UNKNOWN', message: error.message ?? `HTTP ${response.status}` }
}

export const node_request = async ({ node_url, token, method = 'GET', path, body, fetch_impl = fetch }) => {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let response
  try {
    response = await fetch_impl(`${node_url}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      cache: 'no-store'
    })
  } catch {
    return { kind: 'unreachable' }
  }
  return await outcome_of(response)
}

// §9.4 Test Connection.
export const test_connection = async (options) => await node_request({ ...options, path: '/settings' })

// The libraries an import may target: the identity's own, active
// recordstores. A node with more than one takes no import without naming one.
export const list_write_targets = async (options) => {
  const result = await node_request({ ...options, path: '/libraries' })
  if (result.kind !== 'ok') return result
  const libraries = (Array.isArray(result.data) ? result.data : [])
    .filter((library) => library.is_own === true && library.library_type === 'recordstore' && library.is_retired !== true)
    .map((library) => ({
      address: library.address,
      label: library.name || library.address.split('/').pop(),
      track_count: library.track_count
    }))
  return { kind: 'ok', libraries }
}

// §9.5: the node resolves the URL before it answers, so a 202 means the URL
// resolved and ingest is running; the ack carries only an import id.
export const import_url = async ({ url, library_address, ...options }) => await node_request({
  ...options,
  method: 'POST',
  path: '/import/url',
  body: library_address ? { url, library_address } : { url }
})
