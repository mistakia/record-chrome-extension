// Spec §9.8.1: Manifest V3, exactly the §9.3 permissions, no content scripts,
// no host permissions, the default CSP left alone.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'))

test('the manifest is Manifest V3 on Chrome 88 or later', () => {
  assert.equal(manifest.manifest_version, 3)
  assert.equal(manifest.minimum_chrome_version, '88')
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/)
})

test('the manifest declares exactly the §9.3 permissions', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'contextMenus', 'notifications', 'storage'])
  assert.equal(manifest.host_permissions, undefined)
  assert.equal(manifest.optional_permissions, undefined)
  assert.equal(manifest.optional_host_permissions, undefined)
})

test('the manifest has no content scripts and no CSP override', () => {
  assert.equal(manifest.content_scripts, undefined)
  assert.equal(manifest.content_security_policy, undefined)
  assert.equal(manifest.web_accessible_resources, undefined)
  assert.equal(manifest.externally_connectable, undefined)
})

test('the pinned key gives the extension id the node allows', async () => {
  const { createHash } = await import('node:crypto')
  const der = Buffer.from(manifest.key, 'base64')
  const id = [...createHash('sha256').update(der).digest('hex').slice(0, 32)]
    .map((digit) => String.fromCharCode(97 + parseInt(digit, 16))).join('')
  assert.equal(id, 'jnngkjciciffonficmbbbapcbkdooplc')
})
