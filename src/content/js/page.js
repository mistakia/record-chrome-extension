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
})
