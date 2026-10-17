import { test } from 'node:test'
import assert from 'node:assert/strict'

// A stand-in for the browser WebSocket that the test drives by hand.
const sockets = []
class FakeSocket {
  static OPEN = 1
  constructor (url, protocols) {
    Object.assign(this, { url, protocols, readyState: 0, sent: [], closed: false })
    sockets.push(this)
    queueMicrotask(() => { this.readyState = 1; this.onopen?.() })
  }

  send (data) { this.sent.push(data) }
  close () { this.closed = true; this.readyState = 3 }
  emit (type, payload) { this.onmessage?.({ data: JSON.stringify({ type, payload }) }) }
}
globalThis.WebSocket = FakeSocket
globalThis.chrome = { runtime: { id: 'jnngkjciciffonficmbbbapcbkdooplc' } }

const { events_url, prepare_watch } = await import('../extension/lib/import-watch.js')
const { describe_completion } = await import('../extension/lib/import.js')

test('events_url swaps the scheme and offers the token as a subprotocol', async () => {
  assert.equal(events_url('http://127.0.0.1:18088'), 'ws://127.0.0.1:18088/api/ws')
  assert.equal(events_url('https://node.example:8972'), 'wss://node.example:8972/api/ws')
  const handle = await prepare_watch({ node_url: 'https://node.example:8972', token: 'tok' })
  assert.deepEqual(sockets.at(-1).protocols, ['record', 'bearer.tok'])
  handle.cancel()
  assert.equal(sockets.at(-1).closed, true)
})

test('a watch resolves on its import:finished with the tracks and errors', async () => {
  const handle = await prepare_watch({ node_url: 'http://127.0.0.1:18088', token: '' })
  const socket = sockets.at(-1)
  assert.deepEqual(socket.protocols, ['record'])
  const done = handle.watch('a')
  socket.emit('import:starting', { import_id: 'a', file_count: 1 })
  socket.emit('import:processed-file', { import_id: 'other', track: { title: 'x' } })
  socket.emit('import:processed-file', { import_id: 'a', track: { title: 'So U Kno (Audio)', artist: 'Overmono' } })
  socket.emit('import:finished', { import_id: 'a', track_count: 1, error_count: 0 })
  assert.deepEqual(await done, { tracks: [{ title: 'So U Kno (Audio)', artist: 'Overmono' }], errors: [] })
  assert.equal(socket.closed, true)
})

test('events that arrive before the POST answers are replayed', async () => {
  const handle = await prepare_watch({ node_url: 'http://127.0.0.1:18088', token: '' })
  const socket = sockets.at(-1)
  socket.emit('import:error', { import_id: 'b', error: { error: { code: 'INTERNAL_ERROR', message: 'download_failed: aborted' } } })
  socket.emit('import:finished', { import_id: 'b', track_count: 0, error_count: 1 })
  assert.equal(socket.closed, false)
  assert.deepEqual(await handle.watch('b'), { tracks: [], errors: ['download_failed: aborted'] })
})

test('a closed socket settles every pending watch as lost', async () => {
  const handle = await prepare_watch({ node_url: 'http://127.0.0.1:18088', token: '' })
  const socket = sockets.at(-1)
  const done = handle.watch('c')
  socket.onclose()
  assert.deepEqual(await done, { lost: 'the connection to the node closed' })
})

test('describe_completion names the track, the failure, or the lost result', () => {
  assert.deepEqual(describe_completion({ tracks: [{ title: 'So U Kno', artist: 'Overmono' }], errors: [] }),
    { ok: true, title: 'Record: imported', message: 'So U Kno — Overmono.' })
  assert.deepEqual(describe_completion({ tracks: [{ title: null, artist: null }], errors: [] }).message, 'an untitled track.')
  assert.deepEqual(describe_completion({ tracks: [], errors: ['download_failed: aborted'] }),
    { ok: false, title: 'Record: import failed', message: 'download_failed: aborted' })
  assert.equal(describe_completion({ tracks: [{ title: 'a' }, { title: 'b' }], errors: ['x'] }).message, '2 tracks. 1 failed: x')
  assert.equal(describe_completion({ lost: 'no result within 15 minutes' }).title, 'Record: import result unknown')
})
