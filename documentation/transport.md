# Transport
The following transports are supported.

## WebSocket
The WebSocket is a protocol designed for a full-duplex communications over a TCP connection.

#### `ws`

WebSocket. Works if the browser supports [`WebSocket`](http://caniuse.com/#search=websocket). After the `open`, `message`, `close` and all the custom event, it's possible to access a used WebSocket's original event by calling `.data('event')`.

## HTTP
The HTTP is just a protocol based on the request-response paradigm and is not designed for a full-duplex communication. To simulate a full-duplex connection, the following methods defined in `httpbase` transport are used to send data to the server in order.

* XMLHttpRequest - works if the given url is from same-origin or if the given url is from the cross-origin and the browser supports [`CORS`](http://caniuse.com/#search=cors).
* XDomainRequest - works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.
* Form element - always works but causes a clicking sound.

The following mechanisms as transport extending `httpbase` are used to receive data from the server.

### Streaming
The [definition](http://tools.ietf.org/html/rfc6202#section-3.1) and [known issues](http://tools.ietf.org/html/rfc6202#section-3.2) of the HTTP Streaming are well-explained in RFC 6202.

#### `sse`

Server-Sent Events. Works if the browser supports [`EventSource`](http://caniuse.com/#search=eventsource). After the `open`, `message`, `close` whose the reason is `done` and all the custom event, it's possible to access a used Event Source's original event by calling `.data('event')`. By reason of the Server-Sent Events spec's ambiguity, there is no way to determine whether a connection closed normally or not so that the `close` event's reason will be `done` even though the connection closed due to an error.

#### `stream`

Means the `streamxhr`, `streamxdr` and `streamiframe`.

#### `streamxhr`

XMLHttpRequest streaming. Works if the browser supports `XMLHttpRequest`, if the browser is Internet Explorer, the browser version is equal to or higher than 10, or if if the given url is from the cross-origin and the `XMLHttpRequest` supports [`CORS`](http://caniuse.com/#search=cors). 

#### `streamxdr`

XDomainRequest streaming. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

#### `streamiframe`

Hidden Iframe streaming. Works if the browser supports `ActiveXObject` and the given url is from the same-origin. This transport differs from the traditional [Hidden Iframe](http://en.wikipedia.org/wiki/Comet_%28programming%29#Hidden_iframe) in terms of fetching a response text. The traditional transport expects script tags, whereas this transport periodically polls the response text. And, disconnection is not detected.

### Long polling
The [definition](http://tools.ietf.org/html/rfc6202#section-2.1) and [known issues](http://tools.ietf.org/html/rfc6202#section-2.2) of the HTTP Long Polling are well-explained in RFC 6202.

#### `longpoll`

Means the `longpollajax`, `longpollxdr` and `longpolljsonp`. 

#### `longpollajax`

AJAX long polling. Works if the given url is from same-origin or if the given url is from the cross-origin and the browser supports [`CORS`](http://caniuse.com/#search=cors).

#### `longpollxdr`

XDomainRequest long polling. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

### `longpolljsonp` 

JSONP long polling. Works without qualification, but disconnection is not detected.

