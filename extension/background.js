// The service worker: event handlers only, no state kept between events
// (spec §9.5.2). It runs every import, for the popup and the context menu.

import { check_node, run_import } from './lib/import.js'

const MENU_ID = 'record-import-link'
const BADGE_MS = 8000

const register_menu = () => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: 'Import to Record', contexts: ['link'] })
  })
}

chrome.runtime.onInstalled.addListener(register_menu)
chrome.runtime.onStartup.addListener(register_menu)

// A context-menu import opens no popup, so its outcome shows on the icon:
// a badge, and the message in the tooltip, for a few seconds.
const show_on_icon = async ({ state, text }) => {
  const started = state === 'started'
  await chrome.action.setBadgeBackgroundColor({ color: started ? '#2e8a4f' : '#c8372d' })
  await chrome.action.setBadgeText({ text: started ? 'OK' : '!' })
  await chrome.action.setTitle({ title: `Record: ${text}` })
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' })
    chrome.action.setTitle({ title: 'Record' })
  }, BADGE_MS)
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return
  await show_on_icon(await run_import(info.linkUrl))
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
