/* global chrome, Page */
(function () {
  'use strict'

  console.log('record resolver content script injected')

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.command) {
      switch (msg.command) {
        case 'evaluate_page':
          return Page.evaluate(window.location.href)

        default:
          console.log(`Received invalid command ${msg.command}`)
      }
    }
  })

  Page.evaluate(window.location.href)
})()
