// The browser action popup (spec §9.5.1). The service worker runs every
// request; the popup only shows the tab's URL and the outcome, as plain text.

import { is_importable } from './lib/import.js'

const AUTO_CLOSE_MS = 3000

const url_el = document.getElementById('url')
const button = document.getElementById('import')
const status = document.getElementById('status')

const show = ({ state, text }) => {
  status.dataset.state = state
  status.textContent = text
}

const ask = async (message) => await chrome.runtime.sendMessage(message)

document.getElementById('options').addEventListener('click', (event) => {
  event.preventDefault()
  chrome.runtime.openOptionsPage()
})

const start = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''
  url_el.textContent = url
  url_el.title = url
  if (!is_importable(url)) {
    show({ state: 'error', text: 'Only http and https pages can be imported.' })
    return
  }
  const check = await ask({ type: 'check' })
  show(check)
  if (check.state !== 'ready') return
  button.disabled = false
  button.addEventListener('click', async () => {
    button.disabled = true
    button.textContent = 'Importing…'
    const result = await ask({ type: 'import', url })
    show(result)
    button.textContent = result.state === 'started' ? 'Started' : 'Import to Record'
    if (result.state === 'started') setTimeout(() => window.close(), AUTO_CLOSE_MS)
    else button.disabled = false
  })
}

start()
