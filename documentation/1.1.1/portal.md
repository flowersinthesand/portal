---
layout: documentation
title: portal
---

# `portal`
An interface used to manage socket.

---

## Method

### `open(url, [options])`

Opens a socket and returns it.

* **url** (type: String): An URL where the connection is established. 
* **options** (type: Object): A plain object that configures the socket.
                       
    * **transports** (type: Array, default: `["ws", "sse", "stream", "longpoll"]`)
        
        An array of the transport ids, in order of index. A guide to choose a transport list:
        * Add `ws` as a first element of the list if your portal server supports `ws` transport.
        * Add fallback transports.
          * `sse` and `stream` for streaming. 
          * `longpoll` for long polling. 
        
        For details about features and issues of fallback transports and transport availability in the browser, see the transport interface section and the browser support documentation.
        
    * **timeout** (type: Number, default: `false`)
        
        A timeout value in milliseconds. The timeout timer starts at the time the `connecting` event is fired. If the timer expires before the connection is established, the `close` event is fired. The value `false` means no timeout.
        
    * **heartbeat** (type: Number, default: `false`)
        
        A heartbeat interval value in milliseconds. A opened socket continuously sends a heartbeat event to the server each time the value has elapsed. Actually, the socket sends the event 5 seconds before the heartbeat timer expires to wait the server's echo. If the event echoes back within 5 seconds, the socket reset the timer. Otherwise, the `close` event is fired. For that reason, the value must be larger than `5000` and the recommended value is `20000`. The value `false` means no heartbeat.
        
    * **lastEventId** (type: Number, default: `0`)
        
        A initial value for the last event id to be passed to the `urlBuilder` function. Note that this is valid only when the server assures the message-sending order.
        
    * **sharing** (type: Boolean, default: `false`)
        
        A flag indicating that connection sharing across tabs and windows is enabled or not. If this is turned on, as long as the cookie is enabled, the socket object will try to automatically share a real connection if there is no corresponding one, and find and use a shared connection if it exists within the cookie's scope. Note that if the web page or computer becomes horribly busy, a newly created socket might establish a physical connection. 
        
    * **prepare** (type: Function(Function connect(), Function cancel(), Object options))
        
        A function that is called before the socket tries to connect and determines whether to allow the socket to try to connect or not when a physical connection is needed. The function receives three arguments: The callback to connect, the callback to cancel and merged options object. You can use this when the opening handshake is needed, the user is needed to be authenticated and the option is needed to be managed by the server. The default function simply executes the connect function. Note that if the option `sharing` is `true` and there is an available shared connection, this function will not be executed.
        
    * **reconnect** (type: Function(Number lastDelay, Number attempts))
        
        A function to be used to schedule reconnection. The function is called every time after the `close` event is fired and should return a delay in milliseconds or `false` not to reconnect. The function receives two arguments: The last delay in milliseconds used or `null` at first and the total number of reconnection attempts. This can be disabled by setting the value to `false`. The default function returns 500 at first and then the double of the last delay of each call.
        
    * **idGenerator** (type: Function())
        
        A function to be used to generate a socket id. The function should return a string and the returned string should be unique enough for the server to use it as a identifier of the connection until the connection disconnects. The default function generates a random UUID based on the `Math.random`. Note that the default function is enough for the transient use, but if you are going to use it permanently e.g. a persistent field of persistent entity, you have to consider to introduce higher quality of [UUID generator](https://github.com/broofa/node-uuid) based on the `crypto.getRandomValues` or handshake request utilizing `prepare` function.
        
    * **urlBuilder** (type: Function(String url, Object, params, String when))
        
        A function to be used to build an url within specific goal. The function should return an effective url including the given parameters. The function accepts three arguments: The absolute form of the given url, the params object according to the purpose and the purpose of request. The default function appends a query string representation of the `when` and the `params` to the url.
        
        `when` can be one of the following values
        
        * `open`: to establish a connection.  The params has `id`, `transport`, `heartbeat`, `lastEventId` and `_` for anti-caching. Additionaly if the transport is `longpolljsonp`, `callback` is also included to the params.
        * `poll`: In the long polling, the `when` of first request is `open` and that of further requests are `poll`. The params has `id`, `transport`, `lastEventIds` and `_` for anti-caching. Additionaly if the transport is `longpolljsonp`, `callback` is also included to the params.
        * `abort`: to notify the server of disconnection. The params has `id` and `_` for anti-caching.
        
    * **params** (type: Object)
        
        An additional parameters to be merged with the default parameters and passed to the `urlBuilder` function. The first-depth property's name should be the one of the possible `when`. Functions will be called with no arguments.
        
    * **inbound** (type: Function(String data))
        
        A function to be used to convert data sent by the server into an event object. Every data sent by the server invokes the function and it should return an event object having `type`. The event object can have the following optional properties: `id`(an event id), `reply`(if true then a reply event will be sent) and `data`(the first argument of corresponding handlers). The default function parses the data as JSON and returns the parsed value because the server sends a JSON string representing the event as data by default. Note that binary data is considered as a `message` event without calling the function.
        
    * **outbound** (type: Function(Object event))
        
        A function to be used to convert an event object into data to be sent to the server. Every data to be sent to the server invokes the function and it should return a string. The given event object has `id`(an event id), `type`(a event type which the user input), `reply`(if true then a reply event will be received), `socket`(a socket id) and `data`(data which the user input) properties. The default function serializes the event object into JSON and returns it because the server accepts a JSON string representing the event as data by default. Note that binary data is sent as it is instead without calling the function.
        
    * **notifyAbort** (type: Boolean, default: `false`, applicable transport: transport over HTTP protocol)
        
        This option helps the server detect disconnection of HTTP connection when the server does not support to detect disconnection. If it's `true`, when the `close` method is called, simple HTTP GET request whose url is generated by `urlBuilder` with the abort `when`. For example, since browser can't abort script tag used in `longpolljsonp` transport, the only way to abort it is for server to end the response. This option can be used in that case. If multiple connections via `longpolljsonp` are established without this support, browser could not send any request due to the restriction of the number of simultaneous connections.
        
    * **credentials** (type: Boolean, default: `false`, applicable transport: `sse`, `stramxhr`, `longpollajax`)
        
        If the browser implements [Cross-Origin Resource Sharing](http://www.w3.org/TR/cors/) and the value is `true`, user credentials such as cookies and HTTP authentication is to be included in a cross-origin connection.
        
    * **xdrURL** (type: Function(String url), applicable transport: `streamxdr`, `longpollxdr`)
        
        A function used to add session information to an url. For security reasons, the `XDomainRequest` excludes cookie when sending a request, so the session cannot be tracked by cookie. However, if the server supports session tracking by url, it is possible to track the session by [rewriting the url](http://stackoverflow.com/questions/6453779/maintaining-session-by-rewriting-url). If you wish to disable applied transports, set the value to `false` or function returning `false`. The default function modifies the url only if `JSESSIONID` or `PHPSESSID` cookie exists. For example, If the url is `url?k=v` and `JSESSIONID` cookie exists, the url becomes `url;jsessionid=${cookie.JSESSIONID}?k=v`, and if `PHPSESSID` cookie exists, the url becomes `url?PHPSESSID=${cookie.PHPSESSID}&k=v`. Otherwise, it returns `false`.
        
    * **streamParser** (type: Function(String chunk), applicable transport: `streamxhr`, `streamiframe`, `streamxdr`)
        
        A function to parse stream response to find data from chunks. The function receives [chunk](http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.6.1) and should return an array of data and the returned array's length varies with each chunk because a single chunk may contain a single data, multiple data or a fragment of a data. The default function parses a chunk according to the [event stream format](http://www.w3.org/TR/eventsource/#parsing-an-event-stream), but deals with the data field only.
        
### `find()`

Returns the first socket.

### `find(url)`

Returns the socket which is mapped to the given url.