// The service worker: event handlers only, no state kept between events
// (spec §9.5.2). It runs every import, for the popup and the context menu.

import { check_node, run_import } from './lib/import.js'

const MENU_ID = 'record-import-link'

const register_menu = () => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: 'Import to Record', contexts: ['link'] })
  })
}

chrome.runtime.onInstalled.addListener(register_menu)
chrome.runtime.onStartup.addListener(register_menu)

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return
  const { state, text } = await run_import(info.linkUrl)
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/128.png',
    title: state === 'started' ? 'Record: import started' : 'Record: import failed',
    message: text
  })
})

chrome.runtime.onMessage.addListener((message, sender, send_response) => {
  // Only this extension's own pages talk to the worker.
  if (sender.id !== chrome.runtime.id) return false
  if (message?.type === 'import') {
    run_import(message.url).then(send_response)
    return true
  }
  if (message?.type === 'check') {
    check_node().then(send_response)
    return true
  }
  return false
})
