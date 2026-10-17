// Follows a started import to its end over the node's event stream (chapter
// 7 `import:*` events), so the extension can report the result: the node
// answers the POST before it downloads, and reports nothing else. One socket
// serves every pending import and closes when none is left. Chrome keeps a
// service worker alive while its socket carries traffic, so the worker
// sends a keepalive the node ignores while it waits.

const KEEPALIVE_MS = 20_000
const OPEN_TIMEOUT_MS = 5_000
const WATCH_TIMEOUT_MS = 15 * 60_000

const pending = new Map()
// Events for an import whose POST has not answered yet: a source already in
// the library can finish before its import id reaches the worker.
const early = new Map()
const EARLY_LIMIT = 50
// Imports between their POST and their watch, which keep the socket open.
let holds = 0
let socket = null
let opening = null
let keepalive = null

export const events_url = (node_url) => `${node_url.replace(/^http/, 'ws')}/api/ws`

// Folds one event into the import it belongs to; returns the finished
// result, or undefined while the import is still running.
export const fold_event = (watch, { type, payload }) => {
  if (type === 'import:processed-file' && payload.track) {
    watch.tracks.push({ title: payload.track.title ?? null, artist: payload.track.artist ?? null })
  }
  if (type === 'import:error') {
    const error = payload.error?.error ?? payload.error ?? {}
    watch.errors.push(String(error.message ?? 'import failed'))
  }
  if (type === 'import:finished') return { tracks: watch.tracks, errors: watch.errors }
  return undefined
}

const close_if_idle = () => {
  if (pending.size > 0 || holds > 0 || socket === null) return
  early.clear()
  clearInterval(keepalive)
  keepalive = null
  socket.close()
  socket = null
}

const settle = (import_id, result) => {
  const watch = pending.get(import_id)
  if (watch === undefined) return
  pending.delete(import_id)
  clearTimeout(watch.timer)
  watch.resolve(result)
  close_if_idle()
}

const on_message = (message) => {
  let event
  try {
    event = JSON.parse(message.data)
  } catch {
    return
  }
  const import_id = event?.payload?.import_id
  const watch = pending.get(import_id)
  if (watch === undefined) {
    if (typeof import_id !== 'string' || !String(event.type).startsWith('import:')) return
    if (!early.has(import_id) && early.size >= EARLY_LIMIT) early.delete(early.keys().next().value)
    early.set(import_id, [...(early.get(import_id) ?? []), event])
    return
  }
  const result = fold_event(watch, event)
  if (result !== undefined) settle(import_id, result)
}

const drop_all = (reason) => {
  for (const import_id of [...pending.keys()]) settle(import_id, { lost: reason })
}

// Why the last socket failed to open, for the import record.
export let last_open_failure = null

// Opens the shared socket, or resolves false when the node will not take one.
const open_events = async ({ node_url, token }) => {
  if (socket?.readyState === WebSocket.OPEN) return true
  opening ??= new Promise((resolve) => {
    const protocols = token ? ['record', `bearer.${token}`] : ['record']
    let candidate
    try {
      candidate = new WebSocket(events_url(node_url), protocols)
    } catch (error) {
      last_open_failure = String(error?.message ?? error)
      resolve(false)
      return
    }
    const timer = setTimeout(() => { last_open_failure = 'timed out'; candidate.close(); resolve(false) }, OPEN_TIMEOUT_MS)
    candidate.onopen = () => {
      clearTimeout(timer)
      socket = candidate
      socket.onmessage = on_message
      keepalive = setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send('keepalive') }, KEEPALIVE_MS)
      resolve(true)
    }
    candidate.onclose = (event) => {
      clearTimeout(timer)
      if (socket !== candidate) last_open_failure ??= `closed with code ${event?.code ?? 'unknown'}`
      if (socket === candidate) {
        socket = null
        clearInterval(keepalive)
        keepalive = null
        early.clear()
        drop_all('the connection to the node closed')
      }
      resolve(false)
    }
  }).finally(() => { opening = null })
  return await opening
}

// Called before the POST, so no event of the import is missed. The handle's
// watch resolves with { tracks, errors } when the import finishes, or with
// { lost } when the socket closes or the wait runs out first; cancel lets go
// when the POST did not start an import. A node that takes no socket gives
// a null handle, and the import goes unreported.
export const prepare_watch = async (settings) => {
  last_open_failure = null
  if (!(await open_events(settings))) return null
  holds += 1
  let released = false
  const release = () => {
    if (released) return
    released = true
    holds -= 1
  }
  return {
    watch: (import_id) => new Promise((resolve) => {
      release()
      const timer = setTimeout(() => settle(import_id, { lost: 'no result within 15 minutes' }), WATCH_TIMEOUT_MS)
      const watch = { resolve, timer, tracks: [], errors: [] }
      pending.set(import_id, watch)
      const replay = early.get(import_id) ?? []
      early.delete(import_id)
      for (const event of replay) {
        const result = fold_event(watch, event)
        if (result !== undefined) {
          settle(import_id, result)
          return
        }
      }
    }),
    cancel: () => {
      release()
      close_if_idle()
    }
  }
}
