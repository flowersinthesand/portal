---
layout: documentation
title: Browser support
---

# Browser support
The policy for browser support is the same with the one of jQuery 1.x.

* Internet Explorer: 6+
* Chrome: (Current - 1) or Current
* Firefox: (Current - 1) or Current	
* Safari: 5.1+
* Opera: 12.1x, (Current - 1) or Current

In like manner, (Current - 1) or Current indicates that current stable version of the browser and the version that preceded it. Contrary to jQuery, in portal, supporting Internet Explorer 6, 7 and 8 almost never contributes to the performance penalty, yet increase size of code.

## Transport availability
The following list of available transports have been tested with the latest snapshot version of portal.js in current repository and each given browser and the transports not in parenthesis are recommended that is to say `ws` over WebSocket protocol and `see` for streaming and `longpollajax` for long polling over HTTP protocol. Note that some old browsers supporting `ws` implement old WebSocket protocol like hixie-76, therefore in order to support them, the server has to be able to support those protocols.

### Firefox
#### 11
* same origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)
* cross origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)

`ws`: 11 supports [rfc6455](http://tools.ietf.org/html/rfc6455)

#### 6
* same origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)

`ws`: 7 supports [hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10) and 6 supports [hybi-07](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07)

#### 3.6
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `streamxhr`, `longpollajax` (`longpolljsonp`)

#### 3
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `longpolljsonp`

### Chrome
#### 25
* same origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)
* cross origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)

#### 16
* same origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)

`ws`: 16 supports [rfc6455](http://tools.ietf.org/html/rfc6455), 14 supports [hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10)

#### 10
* same origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)

#### 6
* same origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)

`ws`: 6 supports [hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76)

#### 5
* same origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `streamxhr`, `longpollajax` (`longpolljsonp`)

`ws`: 5 supports [hixie-75](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-75)

#### 3
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `streamxhr`, `longpollajax` (`longpolljsonp`)

#### 2
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)

### Internet Explorer
#### 10
* same origin - `ws`, `streamxhr`, `longpollajax` (`streamxdr`, `streamiframe`, `longpollxdr`, `longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`streamxdr`, `longpollxdr`, `longpolljsonp`)

`ws`: 10 supports [rfc6455](http://tools.ietf.org/html/rfc6455)
`streamiframe`: not supported in 10 Metro

#### 8
* same origin - `streamxdr`, `streamiframe`, `longpollajax`, `longpollxdr` ( `longpolljsonp`)
* cross origin - `streamxdr`, `longpollxdr`, `longpolljsonp`

`streamxdr` and `longpollxdr`: disabled by default because XDomainRequest doesn't send any cookies.

#### 6
* same origin - `streamiframe`, `longpollajax` (`longpolljsonp`)
* cross origin - `longpolljsonp`

### Safari
#### 5.1
* same origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)

#### 5.0.1
* same origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `ws`, `streamxhr`, `longpollajax` (`longpolljsonp`)

`ws`: 5.0.1 supports [hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76)

#### 4.0
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `streamxhr`, `longpollajax` (`longpolljsonp`)

#### 3.1
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)

### Opera
#### 15
* same origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)
* cross origin - `ws`, `sse`, `longpollajax` (`streamxhr`, `longpolljsonp`)

#### 12.10
* same origin - `ws`, `sse`, `longpollajax` (`longpolljsonp`)
* cross origin - `ws`, `sse`, `longpollajax` (`longpolljsonp`)

`ws`: 12.10 supports [rfc6455](http://tools.ietf.org/html/rfc6455)

#### 12
* same origin - `sse`, `longpollajax` (`longpolljsonp`)
* cross origin - `sse`, `longpollajax` (`longpolljsonp`)

#### 11.60
* same origin - `sse`, `longpollajax` (`longpolljsonp`)
* cross origin - `longpolljsonp`

#### 11.0
* same origin - `sse`, `longpollajax`

#### 10.0
* same origin - `longpollajax`

### Android
#### 2.1
* same origin - `streamxhr`, `longpollajax` (`longpolljsonp`)
* cross origin - `streamxhr`, `longpollajax` (`longpolljsonp`)