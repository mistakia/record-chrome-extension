# record-chrome-extension

A Manifest V3 Chrome extension that imports the current page, or a link, into a [Record](https://github.com/mistakia/record-docs) node, per spec chapter 9 (`record-docs/spec/9-chrome-extension.md`). The popup imports the tab's URL, and the link context menu carries an "Import to Record" entry. The node decides what it can resolve. The extension has no content scripts and no host permissions, and sends requests only to the configured node.

## Install (sideload)

1. In `chrome://extensions`, turn on Developer mode.
2. Load unpacked, choosing the `extension/` directory.
3. In the extension's options, test the connection, choose the library imports go to, and save.

The manifest's `key` pins the extension id to `jnngkjciciffonficmbbbapcbkdooplc`, so the extension's origin is `chrome-extension://jnngkjciciffonficmbbbapcbkdooplc` on every install. A node admits the extension only when its `cors_origins` lists that origin.

## Development

No build step and no dependencies. `npm test` runs the tests on Node 22, and `npm run package` zips `extension/` for a store upload.

## License

MIT
