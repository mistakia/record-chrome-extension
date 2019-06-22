/* global window, document, Request, setTimeout */

(function (root, factory) {
  root.Record = factory(root)
})(this, function () {
  'use strict'

  return {

    hosts: {

      'soundcloud.com': {
        url: /^(?:https?:\/\/)?(?:(?:(?:www\.|m\.)?soundcloud\.com\/(?!pages|tags|charts|popular|for|search|you)([\w\d-]+)\/(?!sets|reposts|recommended|groups|tracks|following|followers|comments|favorites|likes)([\w\d-]+)\/?(?!recommended|sets|likes|reposts|comments)([\w\d-]+)(?:$|[?#])([^?]+?)?(?:[?].*)?$))/i,
        embed: /^(?:https?:\/\/)?(?:player\.|w\.)?soundcloud\.com\/(?:(?:player)|(?:player.swf))\/?\?(.+)?(?:url=)(.+)?$/i,
        options: {
          container: '.listenEngagement__footer .listenEngagement__actions .sc-button-group',
          classes: ['sc-button', 'sc-button-medium', 'sc-button-responsive']
        }
      },

      'www.youtube.com': {
        url: /^((?:https?:\/\/|\/\/)(?:(?:(?:(?:\w+\.)?[yY][oO][uU][tT][uU][bB][eE](?:-nocookie)?\.com\/)(?:.*?\#\/)?(?:(?:(?:v|embed|e)\/(?!videoseries))|(?:(?:(?:watch|movie)(?:_popup)?(?:\.php)?\/?)?(?:\?|\#!?)(?:.*?&)?v=)))))?([0-9A-Za-z_-]{11})(?!.*?&list=)(.+)?$/i,
        embed: /^((?:https?:\/\/|\/\/)(?:(?:(?:(?:\w+\.)?[yY][oO][uU][tT][uU][bB][eE](?:-nocookie)?\.com\/)(?:.*?\#\/)?(?:(?:(?:v|embed|e)\/(?!videoseries))|(?:(?:(?:watch|movie)(?:_popup)?(?:\.php)?\/?)?(?:\?|\#!?)(?:.*?&)?v=)))))?([0-9A-Za-z_-]{11})(?!.*?&list=)(.+)?$/i,
        options: {
          container: '.watch-action-buttons .watch-secondary-actions',
          classes: ['yt-uix-button', 'yt-uix-button-size-default', 'yt-uix-button-opacity']
        }
      },

      'www.mixcloud.com': {
        url: /^(?:https?:\/\/)?(?:www\.)?mixcloud\.com\/(?!discover|favorites|listens|followers|following|uploads|playlists)([^/]+)\/(?!competitions|categories|tag|groups|previews|widget)([^/]+)\/?$/i,
        embed: /^(?:https?:\/\/)?(?:www\.)?mixcloud\.com\/widget\/iframe\/?\?(.+)?(?:feed=)(.+)?$/i,
        options: {
          container: '.show-header-action-row .actions',
          classes: ['btn', 'btn-small', 'btn-inverse'],
          style: {
            'margin-left': '10px'
          }
        }
      },

      'hypem.com': {
        url: /^https?:\/\/(?:www\.)?hypem\.com\/track\/([^/]+)(.+)?/i,
        options: {
          container: '.section-track',
          classes: [],
          style: {
            position: 'absolute',
            right: '10px',
            top: '35px'
          }
        }
      },

      'bandcamp.com': {
        url: /^https?:\/\/.*?\.bandcamp\.com\/track\/(.*)/i,
        options: {
          container: '.inline_player',
          classes: ['compound-button', 'follow-unfollow'],
          style: {
            'margin-top': '20px'
          }
        }
      }
    },
    api: function (path) {
      path = 'http://localhost:3000' + path
      return {
        get: function (params) {
          params = params || {}
          return Request.get(path, params)
        },
        put: function (params) {
          return Request.put(path, params)
        },
        post: function (params) {
          return Request.post(path, params)
        },
        del: function (params) {
          params = params || {}
          return Request.del(path, params)
        }
      }
    },
    addTrack: function (url, cb) {
      console.log(`Record adding: ${url}`)
      this.api('/tracks').post({ url })
        .success((res) => cb(null, res))
        .error((err) => cb(err))
    }
  }
})
