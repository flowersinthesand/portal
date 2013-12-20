---
layout: documentation
title: Compatibility
---

# Compatibility
## Browser
The policy for browser support is the same with the one of [jQuery 1.x](http://jquery.com/browser-support/).

| Internet Explorer | Chrome | Firefox | Safari | Opera |
|---|---|---|---|---|
| 6+ | (Current - 1) or Current | (Current - 1) or Current | 5.1+ | 12.1x, (Current - 1) or Current|

Contrary to jQuery, supporting Internet Explorer 6, 7 and 8 almost never contributes to the performance penalty, yet increase size of code.

### Transport availability
The following table of available transports have been tested with the latest version of portal.js. Transport list in each cell is ordered by recommendation that is to say `ws` over WebSocket protocol and `see` for streaming and `longpollajax` for long polling over HTTP protocol. 

As to `ws`, a word in parentheses means WebSocket protocol. In order to use `ws`, the server has to be able to support its protocol.

You will see that unsupported browsers are also listed. They are tested with 1.0 and might work OK with the latest version. If not, modify your portal.js according to this [issue](https://github.com/flowersinthesand/portal/issues/116) and relevant commits. 

**Note**

* `streamiframe`: not supported in 10 Metro
* `streamxdr` and `longpollxdr`: disabled by default.

#### Same origin
| Browser | Version | WebSocket | HTTP Streaming | HTTP Long polling |
|---|---|---|---|---|
|Firefox|11|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||7|`ws` ([hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||6|`ws` ([hybi-07](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||3||`streamxhr`|`longpollajax`, `longpolljsonp`|
|Chrome|16|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||14|`ws` ([hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||6|`ws` ([hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||5|`ws` ([hixie-75](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-75))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||2||`streamxhr`|`longpollajax`, `longpolljsonp`|
|Internet Explorer|11|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||10|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`streamxhr`, `streamxdr`, `streamiframe`|`longpollajax`, `longpollxdr`, `longpolljsonp`|
||8||`streamxdr`, `streamiframe`|`longpollajax`, `longpollxdr`, `longpolljsonp`|
||6||`streamiframe`|`longpollajax`, `longpolljsonp`|
|Safari|5.1|`ws` ([hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||5.0.1|`ws` ([hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||3.1||`streamxhr`|`longpollajax`, `longpolljsonp`|
|Opera|15|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||12.10|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`|`longpollajax`, `longpolljsonp`|
||12||`sse`|`longpollajax`, `longpolljsonp`|
||11.60||`sse`|`longpollajax`, `longpolljsonp`|
||11.0||`sse`|`longpollajax`|
||10.0|||`longpollajax`|
|Android|2.1|| `streamxhr`|`longpollajax`, `longpolljsonp`|


#### Cross origin
| Browser | Version | WebSocket | HTTP Streaming | HTTP Long polling |
|---|---|---|---|---|
|Firefox|11|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||7|`ws` ([hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||6|`ws` ([hybi-07](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||3.6||`streamxhr`|`longpollajax`, `longpolljsonp`|
||3|||`longpolljsonp`|
|Chrome|25|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||16|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||14|`ws` [hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10)|`streamxhr`|`longpollajax`, `longpolljsonp`|
||6|`ws` ([hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||3||`streamxhr`|`longpollajax`, `longpolljsonp`|
|Internet Explorer|11|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||10|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`streamxhr`, `streamxdr`|`longpollajax`, `longpollxdr`, `longpolljsonp`|
||8||`streamxdr`|`longpollxdr`, `longpolljsonp`|
||6|||`longpolljsonp`|
|Safari|5.0.1|`ws` ([hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76))|`streamxhr`|`longpollajax`, `longpolljsonp`|
||4.0||`streamxhr`|`longpollajax`, `longpolljsonp`|
|Opera|15|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`, `streamxhr`|`longpollajax`, `longpolljsonp`|
||12.10|`ws` ([rfc6455](http://tools.ietf.org/html/rfc6455))|`sse`|`longpollajax`, `longpolljsonp`|
||12||`sse`|`longpollajax`, `longpolljsonp`|
||11.60|||`longpolljsonp`|
|Android|2.1|| `streamxhr`|`longpollajax`, `longpolljsonp`|

## Node.js
Only `ws`, `sse` and `longpollajax` are supported.