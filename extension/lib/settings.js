// What the extension persists in chrome.storage.local (spec §9.4, §9.6), and
// the checks every value passes before it is stored or used.

export const DEFAULT_NODE_URL = 'http://127.0.0.1:18088'

// The bearer token as §8.7.3 bounds it: RFC 7230 tchar, at most 2048.
export const MAX_TOKEN_CHARS = 2048
const TOKEN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/
const PRINTABLE = /^[\x21-\x7e]{1,512}$/

// A node URL is http or https with no credentials, query or fragment. The
// result is the URL without a trailing slash, so `${node_url}/api` joins.
export const check_node_url = (input) => {
  if (typeof input !== 'string' || input.trim() === '') return { ok: false, reason: 'Enter the node URL.' }
  let url
  try {
    url = new URL(input.trim())
  } catch {
    return { ok: false, reason: 'The node URL is not a valid URL.' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'The node URL must start with http:// or https://.' }
  if (url.username !== '' || url.password !== '') return { ok: false, reason: 'Put the access token in its own field, not in the URL.' }
  if (url.search !== '' || url.hash !== '') return { ok: false, reason: 'The node URL cannot carry a query or a fragment.' }
  return { ok: true, node_url: `${url.origin}${url.pathname}`.replace(/\/+$/, '') }
}

// An empty token means the node takes none.
export const check_token = (input) => {
  const token = typeof input === 'string' ? input.trim() : ''
  if (token === '') return { ok: true, token: '' }
  if (token.length > MAX_TOKEN_CHARS) return { ok: false, reason: `The access token is longer than ${MAX_TOKEN_CHARS} characters.` }
  if (!TOKEN.test(token)) return { ok: false, reason: 'The access token has a space or a character a token cannot carry.' }
  return { ok: true, token }
}

export const check_library_address = (input) => typeof input === 'string' && PRINTABLE.test(input)

// Plain-HTTP warning, the same posture as §8.7.4: fine on loopback, where a
// tunnel carries the traffic, and a cleartext token anywhere else.
export const is_cleartext_remote = (node_url) => {
  const { protocol, hostname } = new URL(node_url)
  return protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(hostname)
}

const DEFAULTS = { node_url: DEFAULT_NODE_URL, token: '', library_address: '', last_status: null, last_import: null }

export const load_settings = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) })

export const save_settings = async (changes) => { await chrome.storage.local.set(changes) }

// A 401 clears the token (§9.6), never the rest of the settings.
export const clear_token = async () => { await chrome.storage.local.set({ token: '' }) }

// The last import's progress, so a result the worker never reported (a
// socket that never opened, a worker Chrome stopped mid-wait) is visible.
// Only the page's host is kept, never a full URL (§9.7.7).
export const record_import = async (fields) => {
  const { last_import } = await chrome.storage.local.get('last_import')
  const same = last_import !== null && last_import !== undefined && (fields.import_id === undefined || last_import.import_id === fields.import_id)
  await chrome.storage.local.set({ last_import: { ...(same ? last_import : {}), ...fields, updated_at: new Date().toISOString() } })
}

export const record_status = async (status) => { await chrome.storage.local.set({ last_status: { ...status, at: new Date().toISOString() } }) }
