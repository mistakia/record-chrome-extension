import { test } from 'node:test'
import assert from 'node:assert/strict'

import { check_library_address, check_node_url, check_token, is_cleartext_remote } from '../extension/lib/settings.js'

test('check_node_url takes http and https and drops a trailing slash', () => {
  assert.deepEqual(check_node_url(' http://127.0.0.1:18088/ '), { ok: true, node_url: 'http://127.0.0.1:18088' })
  assert.deepEqual(check_node_url('https://node.example/record/'), { ok: true, node_url: 'https://node.example/record' })
})

test('check_node_url refuses other schemes, credentials, queries and junk', () => {
  for (const input of ['', 'not a url', 'ftp://host', 'file:///etc', 'javascript:alert(1)', 'http://user@host', 'http://host/?a=1', 'http://host/#x', undefined]) {
    assert.equal(check_node_url(input).ok, false, String(input))
  }
})

test('check_token allows blank and tchar tokens only', () => {
  assert.deepEqual(check_token(''), { ok: true, token: '' })
  assert.deepEqual(check_token(' abc.DEF_123~ '), { ok: true, token: 'abc.DEF_123~' })
  assert.equal(check_token('has space').ok, false)
  assert.equal(check_token('a/b').ok, false)
  assert.equal(check_token('x'.repeat(2049)).ok, false)
})

test('check_library_address takes printable text only', () => {
  assert.equal(check_library_address('/record/zBw/record'), true)
  assert.equal(check_library_address(''), false)
  assert.equal(check_library_address('a b'), false)
})

test('is_cleartext_remote flags plain http off loopback', () => {
  assert.equal(is_cleartext_remote('http://127.0.0.1:18088'), false)
  assert.equal(is_cleartext_remote('http://localhost:8088'), false)
  assert.equal(is_cleartext_remote('https://node.example'), false)
  assert.equal(is_cleartext_remote('http://10.0.0.5:8088'), true)
})
