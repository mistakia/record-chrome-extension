import { test } from 'node:test'
import assert from 'node:assert/strict'

import { import_url, list_write_targets, node_request, test_connection } from '../extension/lib/node-api.js'

const NODE = 'http://127.0.0.1:18088'

const respond = (status, body) => async () => new Response(body === undefined ? null : JSON.stringify(body), { status })

const recording = (status, body) => {
  const calls = []
  return { calls, fetch_impl: async (url, init) => { calls.push({ url, init }); return await respond(status, body)() } }
}

test('import_url posts the URL and library, with the token only when set', async () => {
  const { calls, fetch_impl } = recording(202, { import_id: 'id' })
  const result = await import_url({ node_url: NODE, token: 'tok', url: 'https://a.example/t', library_address: '/record/x/record', fetch_impl })
  assert.deepEqual(result, { kind: 'ok', status: 202, data: { import_id: 'id' } })
  assert.equal(calls[0].url, `${NODE}/api/import/url`)
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok')
  assert.equal(calls[0].init.credentials, 'omit')
  assert.deepEqual(JSON.parse(calls[0].init.body), { url: 'https://a.example/t', library_address: '/record/x/record' })

  const tokenless = recording(200, {})
  await test_connection({ node_url: NODE, token: '', fetch_impl: tokenless.fetch_impl })
  assert.equal(tokenless.calls[0].init.headers.Authorization, undefined)
  assert.equal(tokenless.calls[0].url, `${NODE}/api/settings`)
})

test('node_request names each failure the extension renders', async () => {
  const unreachable = async () => { throw new TypeError('Failed to fetch') }
  assert.deepEqual(await node_request({ node_url: NODE, path: '/settings', fetch_impl: unreachable }), { kind: 'unreachable' })
  assert.deepEqual(await node_request({ node_url: NODE, path: '/settings', fetch_impl: respond(401, { error: { code: 'UNAUTHORIZED' } }) }), { kind: 'unauthorized' })
  assert.deepEqual(
    await node_request({ node_url: NODE, path: '/settings', fetch_impl: respond(403, { error: { code: 'FORBIDDEN', message: 'origin not allowed: chrome-extension://x' } }) }),
    { kind: 'origin_refused' }
  )
  assert.deepEqual(
    await node_request({ node_url: NODE, path: '/import/url', fetch_impl: respond(502, { error: { code: 'RESOLVER_FAILED', message: 'nope' } }) }),
    { kind: 'error', status: 502, code: 'RESOLVER_FAILED', message: 'nope' }
  )
  assert.deepEqual(
    await node_request({ node_url: NODE, path: '/settings', fetch_impl: async () => new Response('<html>', { status: 500 }) }),
    { kind: 'error', status: 500, code: 'UNKNOWN', message: 'HTTP 500' }
  )
})

test('list_write_targets keeps only own, active recordstores', async () => {
  const libraries = [
    { address: '/record/a/record', library_type: 'recordstore', is_own: true, is_retired: false, name: null, track_count: 3 },
    { address: '/record/b/listens', library_type: 'listens', is_own: true, is_retired: false, name: null, track_count: 0 },
    { address: '/record/c/personal', library_type: 'recordstore', is_own: true, is_retired: false, name: 'Personal', track_count: 1 },
    { address: '/record/d/linked', library_type: 'recordstore', is_own: false, is_retired: false, name: null, track_count: 9 },
    { address: '/record/e/old', library_type: 'recordstore', is_own: true, is_retired: true, name: null, track_count: 0 }
  ]
  assert.deepEqual(await list_write_targets({ node_url: NODE, fetch_impl: respond(200, libraries) }), {
    kind: 'ok',
    libraries: [
      { address: '/record/a/record', label: 'record', track_count: 3 },
      { address: '/record/c/personal', label: 'Personal', track_count: 1 }
    ]
  })
})
