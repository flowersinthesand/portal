---
layout: documentation
title: Transport
---

# `transport`
A private interface that used to establish a connection, send data, receive data and close the connection.

**Full-duplex channel over HTTP**

Whereas the WebSocket is a protocol designed for a full-duplex communications over a TCP connection, the HTTP is just a protocol based on the request-response paradigm and has nothing to do with real-time characteristics. To simulate a full-duplex connection over HTTP, the following methods defined in `httpbase` transport are used to send data to the server in order.

* XMLHttpRequest: works if the given url is from same-origin or if the given url is from the cross-origin and the browser supports [`CORS`](http://caniuse.com/#search=cors).
* XDomainRequest: works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.
* Form element: always works but causes a clicking sound.

To receive data from the server, a.k.a. server-push, streaming and long polling are implemented. These mechanisms' definition and known issues are well-explained in [RFC 6202](http://tools.ietf.org/html/rfc6202). You should read it to choose a fallback's mechanism.

* Streaming: `sse`, `stream`, `streamxhr`, `streamxdr`, `streamiframe`.
* Long polling: `longpoll`, `longpollajax`, `longpollxdr`, `longpolljsonp`.

## Implementation
The following implementations are ready to use.

### `ws`

WebSocket. Works if the browser supports [`WebSocket`](http://caniuse.com/#search=websocket). After the `open`, `message`, `close` and all the custom event, it's possible to access a used WebSocket's original event by calling `.data('event')`.

### `sse`

Server-Sent Events. Works if the browser supports [`EventSource`](http://caniuse.com/#search=eventsource). After the `open`, `message`, `close` whose the reason is `done` and all the custom event, it's possible to access a used Event Source's original event by calling `.data('event')`. By reason of the Server-Sent Events spec's ambiguity, there is no way to determine whether a connection closed normally or not so that the `close` event's reason will be `done` even though the connection closed due to an error.

### `stream`

Means the `streamxhr`, `streamxdr` and `streamiframe`.

### `streamxhr`

XMLHttpRequest streaming. Works if the browser supports `XMLHttpRequest`, if the browser is Internet Explorer, the browser version is equal to or higher than 10, or if if the given url is from the cross-origin and the `XMLHttpRequest` supports [`CORS`](http://caniuse.com/#search=cors). 

### `streamxdr`

XDomainRequest streaming. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

### `streamiframe`

Hidden Iframe streaming. Works if the browser supports `ActiveXObject` and the given url is from the same-origin. This transport differs from the traditional [Hidden Iframe](http://en.wikipedia.org/wiki/Comet_%28programming%29#Hidden_iframe) in terms of fetching a response text. The traditional transport expects script tags, whereas this transport periodically polls the response text. And, disconnection is not detected.

### `longpoll`

Means the `longpollajax`, `longpollxdr` and `longpolljsonp`. 

### `longpollajax`

AJAX long polling. Works if the given url is from same-origin or if the given url is from the cross-origin and the browser supports [`CORS`](http://caniuse.com/#search=cors).

### `longpollxdr`

XDomainRequest long polling. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

### `longpolljsonp` 

JSONP long polling. Works without qualification, but disconnection is not detected.