import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.chrome = { runtime: { id: 'jnngkjciciffonficmbbbapcbkdooplc' } }
const { describe_failure, is_importable } = await import('../extension/lib/import.js')

test('is_importable takes http and https pages only', () => {
  assert.equal(is_importable('https://soundcloud.com/a/b'), true)
  assert.equal(is_importable('http://example.com'), true)
  assert.equal(is_importable('chrome://extensions'), false)
  assert.equal(is_importable(''), false)
})

test('describe_failure maps each node refusal to its popup state', () => {
  assert.equal(describe_failure({ kind: 'unreachable' }).state, 'unreachable')
  assert.equal(describe_failure({ kind: 'unauthorized' }).state, 'unauthorized')
  assert.match(describe_failure({ kind: 'origin_refused' }).text, /chrome-extension:\/\/jnngkjciciffonficmbbbapcbkdooplc/)
  assert.equal(describe_failure({ kind: 'error', code: 'RESOLVER_FAILED', message: 'x' }).text, 'Could not resolve this URL.')
  assert.equal(describe_failure({ kind: 'error', code: 'VALIDATION_ERROR', message: 'no source found at https://a' }).text, 'Could not resolve this URL.')
  assert.equal(describe_failure({ kind: 'error', code: 'VALIDATION_ERROR', message: 'no extractor supports https://example.com/' }).text, 'Could not resolve this URL.')
  assert.equal(describe_failure({ kind: 'error', code: 'CONFLICT', message: 'busy' }).text, 'busy')
})
