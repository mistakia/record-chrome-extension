/* global Elem */

(function (root, factory) {
  root.Loading = factory(root)
})(this, function () {
  'use strict'

  return {
    show: function () {
      var html = '<div class="record-md-loading indeterminate">' +
        '<div class="record-md-spinner-wrapper">' +
        '<div class="record-md-inner">' +
        '<div class="record-md-gap"></div>' +
        '<div class="record-md-left">' +
        '<div class="record-md-half-circle"></div>' +
        '</div>' +
        '<div class="record-md-right">' +
        '<div class="record-md-half-circle"></div>' +
        '</div></div></div></div>'

      Elem.create({
        id: 'record-loading',
        html: html,
        parent: document.body
      })
    },

    hide: function () {
      document.getElementById('record-loading').remove()
    }
  }
})
