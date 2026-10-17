// The service worker: event handlers only (spec §9.5.2), with no state but
// the imports it follows to their result (lib/import-watch.js). It runs every
// import, for the popup and the context menu.

import { check_node, describe_completion, run_import } from './lib/import.js'

const MENU_ID = 'record-import-link'

const register_menu = () => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: 'Import to Record', contexts: ['link'] })
  })
}

chrome.runtime.onInstalled.addListener(register_menu)
chrome.runtime.onStartup.addListener(register_menu)

const notify = ({ title, message }) => {
  chrome.notifications.create({ type: 'basic', iconUrl: 'icons/128.png', title, message })
}

const report_completion = (completion) => {
  completion?.then((result) => notify(describe_completion(result)))
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return
  const { outcome, completion } = await run_import(info.linkUrl)
  // A started import with a completion reports once, when it finishes.
  if (outcome.state !== 'started' || completion === null) {
    notify({ title: outcome.state === 'started' ? 'Record: import started' : 'Record: import failed', message: outcome.text })
  }
  report_completion(completion)
})

chrome.runtime.onMessage.addListener((message, sender, send_response) => {
  // Only this extension's own pages talk to the worker.
  if (sender.id !== chrome.runtime.id) return false
  if (message?.type === 'import') {
    run_import(message.url).then(({ outcome, completion }) => {
      send_response(outcome)
      report_completion(completion)
    })
    return true
  }
  if (message?.type === 'check') {
    check_node().then(send_response)
    return true
  }
  return false
})
