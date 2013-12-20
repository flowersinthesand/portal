---
layout: news
title: "Portal 1.1.0 released"
categories: [news, release]
---

# Portal 1.1.0 released

This first minor release supports Node.js, Asynchronous Module Definition (AMD), writing portal server and has bug fixes. There is no backward compatibility issue but you might want to check newly introduced policy for browser support.

### Highlight
* **AMD support.** portal.js can be loaded by `require` in browser as an AMD module.
* **Node.js support.** portal.js can run as Node.js client as well as browser client and is published to npm under the name of [`portal-client`](https://npmjs.org/package/portal-client).
* **Test suite rewritten.** To help write portal server, test suite is rewritten and runs on Node.js.
* **Dropped support for old browsers.** As policy for browser support, the one of jQuery 1.x is chosen and support for some old browsers is dropped accordingly.
* **Website.** Project's website is built using Foundation 5 and news and docs are added.

See more on [v1.1.0 issues](https://github.com/flowersinthesand/portal/issues?milestone=12&page=1&state=closed).
