// The options page (spec §9.5.3): node URL, bearer token, the library imports
// go to, Test Connection, and the last known connection status.

import { describe_failure } from './lib/import.js'
import { list_write_targets, test_connection } from './lib/node-api.js'
import { check_library_address, check_node_url, check_token, clear_token, is_cleartext_remote, load_settings, record_status, save_settings } from './lib/settings.js'

const $ = (id) => document.getElementById(id)
const node_url_input = $('node_url')
const token_input = $('token')
const library_select = $('library')

const show = (element, { state, text }) => {
  element.dataset.state = state
  element.textContent = text
}

const fill_libraries = (libraries, selected) => {
  library_select.replaceChildren()
  const placeholder = new Option(libraries.length === 0 ? 'No library loaded: test the connection' : 'Choose a library', '')
  library_select.append(placeholder)
  for (const { address, label, track_count } of libraries) {
    const option = new Option(`${label} (${track_count ?? 0} tracks)`, address)
    option.title = address
    library_select.append(option)
  }
  // Keep a saved choice visible before its node has been asked.
  if (selected && !libraries.some(({ address }) => address === selected)) {
    library_select.append(new Option(selected.split('/').pop(), selected))
  }
  library_select.value = selected ?? ''
}

const read_form = () => {
  const url = check_node_url(node_url_input.value)
  if (!url.ok) return { ok: false, reason: url.reason }
  const token = check_token(token_input.value)
  if (!token.ok) return { ok: false, reason: token.reason }
  return { ok: true, node_url: url.node_url, token: token.token }
}

const warn_cleartext = () => {
  const url = check_node_url(node_url_input.value)
  $('node_url_warning').textContent = url.ok && is_cleartext_remote(url.node_url)
    ? 'Plain http to another host sends the URLs and the token unencrypted. Use https off this machine.'
    : ''
}

const show_last_status = (last_status) => {
  if (!last_status) {
    show($('last_status'), { state: '', text: 'Not yet tested.' })
    return
  }
  const when = new Date(last_status.at).toLocaleString()
  show($('last_status'), last_status.ok
    ? { state: 'ok', text: `Connected, ${when}` }
    : { state: 'error', text: `${describe_failure({ kind: last_status.kind }).text} ${when}` })
}

const test = async () => {
  const form = read_form()
  if (!form.ok) {
    show($('test_status'), { state: 'error', text: form.reason })
    return
  }
  show($('test_status'), { state: '', text: 'Testing…' })
  const connection = await test_connection(form)
  const result = connection.kind === 'ok' ? await list_write_targets(form) : connection
  if (result.kind === 'unauthorized') {
    await clear_token()
    token_input.value = ''
  }
  await record_status(result.kind === 'ok' ? { ok: true } : { ok: false, kind: result.kind })
  show_last_status((await load_settings()).last_status)
  if (result.kind !== 'ok') {
    show($('test_status'), describe_failure(result))
    return
  }
  fill_libraries(result.libraries, library_select.value)
  show($('test_status'), { state: 'ok', text: `Connected. ${result.libraries.length} librar${result.libraries.length === 1 ? 'y' : 'ies'} can take imports.` })
}

const save = async () => {
  const form = read_form()
  if (!form.ok) {
    show($('save_status'), { state: 'error', text: form.reason })
    return
  }
  const library_address = library_select.value
  if (!check_library_address(library_address)) {
    show($('save_status'), { state: 'error', text: 'Choose a library to import into.' })
    return
  }
  await save_settings({ node_url: form.node_url, token: form.token, library_address })
  node_url_input.value = form.node_url
  show($('save_status'), { state: 'ok', text: 'Saved.' })
}

const start = async () => {
  $('origin').textContent = `chrome-extension://${chrome.runtime.id}`
  const settings = await load_settings()
  node_url_input.value = settings.node_url
  token_input.value = settings.token
  fill_libraries([], settings.library_address)
  show_last_status(settings.last_status)
  warn_cleartext()
  node_url_input.addEventListener('input', warn_cleartext)
  $('test').addEventListener('click', test)
  $('save').addEventListener('click', save)
  await test()
}

start()
