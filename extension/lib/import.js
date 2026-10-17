// One import as both affordances run it (spec §9.5.1, §9.5.2): read the
// settings, POST the URL, clear the token on a 401, record the connection
// status, and turn the outcome into a state and the text to show for it.

import { prepare_watch } from './import-watch.js'
import { import_url, test_connection } from './node-api.js'
import { clear_token, load_settings, record_status } from './settings.js'

export const is_importable = (url) => {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const ORIGIN_HINT = () => `The node refuses this extension. Add chrome-extension://${chrome.runtime.id} to the node's cors_origins.`

export const describe_failure = (result) => {
  if (result.kind === 'unreachable') return { state: 'unreachable', text: 'Record node is unreachable.' }
  if (result.kind === 'unauthorized') return { state: 'unauthorized', text: 'The node refused the access token. Re-authenticate in options.' }
  if (result.kind === 'origin_refused') return { state: 'error', text: ORIGIN_HINT() }
  if (result.code === 'RESOLVER_FAILED' || (result.code === 'VALIDATION_ERROR' && /no source found|no extractor supports/.test(result.message))) {
    return { state: 'error', text: 'Could not resolve this URL.' }
  }
  if (result.code === 'NOT_FOUND') return { state: 'error', text: 'The chosen library is not open on this node. Choose another in options.' }
  return { state: 'error', text: result.message }
}

const settle = async (result) => {
  if (result.kind === 'unauthorized') await clear_token()
  if (result.kind === 'unreachable' || result.kind === 'unauthorized' || result.kind === 'origin_refused') {
    await record_status({ ok: false, kind: result.kind })
  } else {
    await record_status({ ok: true })
  }
}

const track_name = ({ title, artist }) => [title, artist].filter(Boolean).join(' — ') || 'an untitled track'

// The notification text for a finished import (import-watch.js).
export const describe_completion = (result) => {
  if (result.lost !== undefined) return { ok: false, title: 'Record: import result unknown', message: `${result.lost}. Check Record for the track.` }
  if (result.errors.length > 0 && result.tracks.length === 0) return { ok: false, title: 'Record: import failed', message: result.errors[0] }
  const names = result.tracks.length === 1 ? track_name(result.tracks[0]) : `${result.tracks.length} tracks`
  const failed = result.errors.length > 0 ? ` ${result.errors.length} failed: ${result.errors[0]}` : ''
  return { ok: result.errors.length === 0, title: 'Record: imported', message: `${names}.${failed}` }
}

// Resolves with the outcome to show now, and a completion promise for the
// import's result when the node's event stream could follow it.
export const run_import = async (url) => {
  if (!is_importable(url)) return { outcome: { state: 'error', text: 'Only http and https pages can be imported.' }, completion: null }
  const { node_url, token, library_address } = await load_settings()
  if (!library_address) return { outcome: { state: 'unconfigured', text: 'Choose a library to import into in options.' }, completion: null }
  const watcher = await prepare_watch({ node_url, token })
  const result = await import_url({ node_url, token, url, library_address })
  await settle(result)
  console.info(`record: import ${result.kind}${result.status ? ` ${result.status}` : ''}`)
  if (result.kind !== 'ok' || typeof result.data?.import_id !== 'string') {
    watcher?.cancel()
    return { outcome: result.kind === 'ok' ? { state: 'started', text: 'Import started.' } : describe_failure(result), completion: null }
  }
  const completion = watcher === null ? null : watcher.watch(result.data.import_id)
  const text = completion === null
    ? 'Import started. The track appears in Record when ingest finishes.'
    : 'Import started. A notification reports the result.'
  return { outcome: { state: 'started', text }, completion }
}

export const check_node = async () => {
  const { node_url, token, library_address } = await load_settings()
  const result = await test_connection({ node_url, token })
  await settle(result)
  if (result.kind !== 'ok') return describe_failure(result)
  if (!library_address) return { state: 'unconfigured', text: 'Choose a library to import into in options.' }
  return { state: 'ready', text: '' }
}
