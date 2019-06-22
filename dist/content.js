/* global window, document, Element */
(function (root, factory) {
  root.Elem = factory(root)
})(this, function () {
  'use strict'

  return {
    create: function (opts) {
      opts = opts || {}
      var el, a, i, d

      el = document.createElement(opts.tag || 'div')

      if (opts.className) {
        el.className = opts.className
      }

      if (opts.id) {
        el.id = opts.id
      }

      if (opts.attributes) {
        for (a in opts.attributes) {
          el.setAttribute(a, opts.attributes[a])
        }
      }

      if (opts.html !== undefined) {
        el.innerHTML = opts.html
      }

      if (opts.text) {
        el.appendChild(document.createTextNode(opts.text))
      }

      // IE 8 doesn"t have HTMLElement
      if (window.HTMLElement === undefined) {
        window.HTMLElement = Element
      }

      if (opts.childs && opts.childs.length) {
        for (i = 0; i < opts.childs.length; i++) {
          el.appendChild(opts.childs[i] instanceof window.HTMLElement ? opts.childs[i] : this.create(opts.childs[i]))
        }
      }

      if (opts.parent) {
        opts.parent.appendChild(el)
      }

      if (opts.onclick) {
        el.onclick = opts.onclick
      }

      if (opts.dataset) {
        for (d in opts.dataset) {
          el.dataset[d] = opts.dataset[d]
        }
      }

      return el
    },

    getClosest: function (elem, selector) {
      var firstChar = selector.charAt(0)

      for (; elem && elem !== document; elem = elem.parentNode) {
        if (firstChar === '.') {
          if (elem.classList.contains(selector.substr(1))) { return elem }
        }

        if (firstChar === '#') {
          if (elem.id === selector.substr(1)) { return elem }
        }

        if (firstChar === '[') {
          if (elem.hasAttribute(selector.substr(1, selector.length - 2))) { return elem }
        }

        if (elem.tagName.toLowerCase() === selector) return elem
      }

      return false
    },

    getOffX: function (o) {
      // http://www.xs4all.nl/~ppk/js/findpos.html
      var curleft = 0
      if (o.offsetParent) {
        while (o.offsetParent) {
          curleft += o.offsetLeft
          o = o.offsetParent
        }
      } else if (o.x) {
        curleft += o.x
      }
      return curleft
    },

    getTheDamnTarget: function (e) {
      return (e.target || (window.event ? window.event.srcElement : null))
    },

    isChildOfClass: function (oChild, oClass) {
      if (!oChild || !oClass) return false

      while (oChild.parentNode && !oChild.classList.contains(oClass)) {
        oChild = oChild.parentNode
      }
      return oChild.classList.contains(oClass)
    },

    text: function (o) {
      return o.innerText || o.textContent
    },

    each: function (array, callback, scope) {
      for (var i = 0; i < array.length; i++) {
        callback.call(scope, array[i], i)
      }
    }
  }
});

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
});

/* global Record, DOMTokenList, alert */

(function (root, factory) {
  root.Page = factory(root)
})(this, function () {
  return {
    container: null,
    button: null,
    url: null,
    timeout: 0,
    buttonId: 'recordButton-9000',

    handleClick: function () {
      var self = this

      self.button.innerHTML = 'importing...'

      Record.addTrack(this.url, (err, data) => {
        if (err) {
          if (err.message === 'ERR_CONNECTION_REFUSED') {
            alert('Record must be open to import.')
            self.button.innerHTML = 'import to record'
            return
          }

          self.button.innerHTML = 'error'
          return
        }

        self.button.innerHTML = 'imported'
      })
    },

    insertButton: function (options) {
      this.container = document.querySelector(options.container)
      if (!this.container) {
        this.timeout += 1000
        console.log(`record button container [${options.container}] not found, trying again in ${this.timeout}ms`)
        return setTimeout(() => this.insertButton(options), this.timeout)
      }

      if (document.getElementById(this.buttonId)) return

      this.button = document.createElement(options.element || 'button')
      this.button.id = this.buttonId

      DOMTokenList.prototype.add.apply(this.button.classList, options.classes)
      for (var style in options.style) {
        if (options.style.hasOwnProperty(style)) { this.button.style[style] = options.style[style] }
      }
      this.button.addEventListener('click', this.handleClick.bind(this))
      this.container.appendChild(this.button)
      this.button.innerHTML = 'import to record'
      console.log('record button inserted', this.button)
    },

    evaluate: function (url) {
      this.timeout = 0
      if (this.url === url) return
      this.url = url

      console.log(`Matching ${url}`)

      for (var p in Record.hosts) {
        if (Record.hosts.hasOwnProperty(p) && Record.hosts[p].url.test(url)) {
          if (p === 'www.youtube.com' && document.getElementsByTagName('ytd-app')) {
            return this.insertButton({
              element: 'ytd-button-renderer',
              container: '#info.ytd-video-primary-info-renderer',
              classes: ['style-scope', 'ytd-button-renderer', 'force-icon-button', 'style-default']
            })
          }
          return this.insertButton(Record.hosts[p].options)
        }
      }
      console.log('single page does not match')
    }
  }
});

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
});

/* global ActiveXObject, XMLHttpRequest */

(function (root, factory) {
  root.Request = factory(root)
})(this, function (root) {
  'use strict'

  function serialize (obj) {
    var str = []
    for (var p in obj) {
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
      }
    }
    return str.join('&')
  }

  var parse = function (req) {
    var result
    try {
      result = JSON.parse(req.responseText)
    } catch (e) {
      result = req.responseText
    }
    return [result, req]
  }

  var getXHR = function () {
    if (root.XMLHttpRequest &&
      (!root.location || root.location.protocol !== 'file:' ||
        !root.ActiveXObject)) {
      return new XMLHttpRequest()
    } else {
      try { return new ActiveXObject('Microsoft.XMLHTTP') } catch (e) {}
      try { return new ActiveXObject('Msxml2.XMLHTTP.6.0') } catch (e) {}
      try { return new ActiveXObject('Msxml2.XMLHTTP.3.0') } catch (e) {}
      try { return new ActiveXObject('Msxml2.XMLHTTP') } catch (e) {}
    }
    return false
  }

  var xhr = function (type, url, data) {
    var methods = {
      success: function () {},
      error: function () {}
    }
    var request = getXHR()

    if (!request) throw new Error('unable to detect XHR')

    request.open(type, url, true)
    request.setRequestHeader('Content-type', 'application/json')
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status === 200) {
          methods.success.apply(methods, parse(request))
        } else if (request.status === 0) {
          methods.error.apply(methods, [new Error('ERR_CONNECTION_REFUSED')])
        } else {
          methods.error.apply(methods, parse(request))
        }
      }
    }

    request.send(JSON.stringify(data))
    return {
      success: function (callback) {
        methods.success = callback
        return this
      },
      error: function (callback) {
        methods.error = callback
        return this
      }
    }
  }

  return {
    get: function (url, data) {
      if (data) url += '?' + serialize(data)
      return xhr('GET', url)
    },
    put: function (url, data) {
      return xhr('PUT', url, data)
    },
    post: function (url, data) {
      return xhr('POST', url, data)
    },
    del: function (url, data) {
      if (data) url += '?' + serialize(data)
      return xhr('DELETE', url)
    }
  }
});

/* global atob, Blob, ArrayBuffer, Uint8Array */
(function (root, factory) {
  root.Utils = factory(root)
})(this, function () {
  'use strict'

  var o = {
    sec: 1000,
    min: 60 * 1000,
    hr: 60 * 1000 * 60,
    day: 24 * 60 * 1000 * 60,
    wk: 7 * 24 * 60 * 1000 * 60,
    mo: 30 * 24 * 60 * 1000 * 60,
    yr: 365 * 24 * 60 * 1000 * 60
  }

  var mimesToExt = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/tiff': 'tif'
  }

  return {

    dataURItoBlob: function (dataURI) {
      var byteString = atob(dataURI.split(',')[1])

      var mimeString = dataURI.split(',')[0].split(':')[1].split('')[0]

      var ab = new ArrayBuffer(byteString.length)
      var ia = new Uint8Array(ab)
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      var bb = new Blob([ab], { type: mimeString })
      return bb
    },

    duration: function (v) {
      if (!v) return ''
      var secNum = parseInt(v, 10)
      var hours = Math.floor(secNum / 3600)
      var minutes = Math.floor((secNum - (hours * 3600)) / 60)
      var seconds = secNum - (hours * 3600) - (minutes * 60)

      if (hours < 10) { hours = hours ? '0' + hours + ':' : '' } else hours = hours + ':'

      if (minutes < 10) { minutes = '0' + minutes + ':' } else minutes = minutes + ':'

      if (seconds < 10) { seconds = '0' + seconds }

      return hours + minutes + seconds
    },

    fromNow: function (nd) {
      if (!nd) return 'now'
      var r = Math.round; var pl = function (v, n) {
        return n + ' ' + v + (n > 1 ? 's' : '') + ' ago'
      }; var ts = new Date().getTime() - new Date(nd).getTime(); var ii
      if (ts < 0) return 'now'
      for (var i in o) {
        if (o.hasOwnProperty(i)) {
          if (r(ts) < o[i]) return pl(ii || 'm', r(ts / (o[ii] || 1)))
          ii = i
        }
      }
      return pl(i, r(ts / o[i]))
    },

    exists: function (array, value, attr) {
      return !!array[this.find(array, value, attr)]
    },

    find: function (array, value, attr) {
      attr = attr || 'id'
      for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) return i
      }

      return -1
    },

    // https://github.com/bevacqua/fuzzysearch
    fuzzysearch: function (needle, haystack) {
      var hlen = haystack.length
      var nlen = needle.length
      if (nlen > hlen) {
        return false
      }
      if (nlen === hlen) {
        return needle === haystack
      }
      outer: for (var i = 0, j = 0; i < nlen; i++) {
        var nch = needle.charCodeAt(i)
        while (j < hlen) {
          if (haystack.charCodeAt(j++) === nch) {
            continue outer
          }
        }
        return false
      }
      return true
    },

    getExtByMime: function (mime) {
      if (mimesToExt.hasOwnProperty(mime)) {
        return mimesToExt[mime]
      }
      return false
    },
    isUrl: function (text) {
      var pattern = '^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(?::\\d{2,5})?' + // port
        '(?:/[^\\s]*)?$' // path

      var re = new RegExp(pattern, 'i')
      return re.test(text)
    },

    clone: function (obj) {
      var target = {}
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          target[i] = obj[i]
        }
      }
      return target
    }
  }
});

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
