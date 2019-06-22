/* global chrome */

var chromeRe = /^chrome([^:]+)?:\/\/(.+)?/i

var callback = function (tabId, changeInfo, tab) {
  if (!tab) return
  if (chromeRe.test(tab.url)) return

  chrome.tabs.sendMessage(tabId, {
    command: 'evaluate_page'
  })
}

chrome.tabs.onUpdated.addListener(callback)
chrome.tabs.onCreated.addListener(callback)
