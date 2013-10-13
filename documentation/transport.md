## Transport
The following are supported transports in order of providing stable connection.

### `ws`

WebSocket. Works if the browser supports [`WebSocket`](http://caniuse.com/#search=websocket) or `MozWebSocket`. After the `open`, `message`, `close` and all the custom event, it's possible to access a used WebSocket's original event by calling `.data('event')`.

### `httpbase`

Gives http based transports the capability to send data to the server.

### `sse`

Server-Sent Events. Works if the browser supports [`EventSource`](http://caniuse.com/#search=eventsource) and the given url is from the same-origin or from the cross-origin and the `EventSource` supports [`CORS`](http://caniuse.com/#search=cors). After the `open`, `message`, `close` whose the reason is `done` and all the custom event, it's possible to access a used Event Source's original event by calling `.data('event')`. By reason of the Server-Sent Events spec's ambiguity, there is no way to determine whether a connection closed normally or not so that the `close` event's reason will be `done` even though the connection closed due to an error.

### `stream`

Means the `streamxhr`, `streamxdr` and `streamiframe`.

### `streamxhr`

XMLHttpRequest streaming. Works if the browser supports `XMLHttpRequest`, if the browser is Internet Explorer, the browser version is equal to or higher than 10, and the `XMLHttpRequest` supports [`CORS`](http://caniuse.com/#search=cors) if the given url is from the cross-origin. In the case of Opera, the transport periodically polls the response text.

### `streamxdr`

XDomainRequest streaming. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

### `streamiframe`

Hidden Iframe streaming. Works if the browser supports `ActiveXObject` and the given url is from the same-origin. This transport differs from the traditional [Hidden Iframe](http://en.wikipedia.org/wiki/Comet_%28programming%29#Hidden_iframe) in terms of fetching a response text. The traditional transport expects script tags, whereas this transport periodically polls the response text. And, disconnection is not detected.

### `longpoll`

Means the `longpollajax`, `longpollxdr` and `longpolljsonp`. 

### `longpollajax`

AJAX long polling. Works if the given url is from same-origin or the browser supports [`CORS`](http://caniuse.com/#search=cors) if the given url is from the cross-origin.

### `longpollxdr`

XDomainRequest long polling. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

### `longpolljsonp` 

JSONP long polling. Works without qualification, but disconnection is not detected.

