# API
# API
# API
# API
Undocumented properties and methods are considered as private to the library.

**Table of Contents**
- [`portal`](#portal)
    - [Method](#method)
- [`socket`](#socket)
    - [Event](#event)
    - [Method](#method-1)
- [`transport`](#transport)
    - [Implementation](#implementation)

## `portal`
An interface used to manage socket.

### Method

#### `open(url, [options])`

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
        
        This option helps the server detect disconnection of HTTP connection when the server does not support to detect disconnection. If it's `true`, when the `close` method is called, simple HTTP GET request whose url is generated by `urlBuilder` with the abort `when`.
        
    * **credentials** (type: Boolean, default: `false`, applicable transport: `sse`, `stramxhr`, `longpollajax`)
        
        If the browser implements [Cross-Origin Resource Sharing](http://www.w3.org/TR/cors/) and the value is `true`, user credentials such as cookies and HTTP authentication is to be included in a cross-origin connection.
        
    * **xdrURL** (type: Function(String url), applicable transport: `streamxdr`, `longpollxdr`)
        
        A function used to add session information to an url. For security reasons, the `XDomainRequest` excludes cookie when sending a request, so the session cannot be tracked by cookie. However, if the server supports session tracking by url, it is possible to track the session by [rewriting the url](http://stackoverflow.com/questions/6453779/maintaining-session-by-rewriting-url). If you wish to disable applied transports, set the value to `false` or function returning `false`. The default function modifies the url only if `JSESSIONID` or `PHPSESSID` cookie exists. For example, If the url is `url?k=v` and `JSESSIONID` cookie exists, the url becomes `url;jsessionid=${cookie.JSESSIONID}?k=v`, and if `PHPSESSID` cookie exists, the url becomes `url?PHPSESSID=${cookie.PHPSESSID}&k=v`. Otherwise, it returns `false`.
        
    * **streamParser** (type: Function(String chunk), applicable transport: `streamxhr`, `streamiframe`, `streamxdr`)
        
        A function to parse stream response to find data from chunks. The function receives [chunk](http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.6.1) and should return an array of data and the returned array's length varies with each chunk because a single chunk may contain a single data, multiple data or a fragment of a data. The default function parses a chunk according to the [event stream format](http://www.w3.org/TR/eventsource/#parsing-an-event-stream), but deals with the data field only.
        
#### `find()`

Returns the first socket.

#### `find(url)`

Returns the socket which is mapped to the given url.

## `socket`
The feature-rich and flexible interface for two-way communication.

**Life cycle**

Socket always is in a specific state. According to the status of connection to the server, transition between states occurs and this circulating transition makes a life cycle. The following list is a list of state which a socket can be in.

* **preparing**

    As an initial state of life cycle, the `preparing` state gives opportunity to prepare physical connection establishment. If the `sharing` options is `true` and there is a shared connection or unless the `prepare` handler is newly set, this state will be skipped so that there is no relevant event for this state. In this state, the socket is initialized.

    When you need to work with the server before connecting like overriding options, handshaking and authenticating user, you can do that in `preparing` state using `prepare` handler.

    State transition occurs to
    * connecting: If `prepare` handler's `connect` function is executed. The default `prepare` handler executes `connect` function simply.
    * closed: If `prepare` handler's `cancel` function is executed - `canceled`. if there is no available transport in `transports` option under given options and situation - `notransport`.

* **connecting**

    The selected transport starts connecting to the server and the `connecting` event is fired. Timer for time-out is activated, environment for connection sharing is constructed and the socket starts to share its connection if corresponding options allow to do that.
    
    The `connecting` event is an initial event which the socket fires, so that you can set session-scoped value to initialize or configure application in connecting event handlers.
    
    State transition occurs to
    * opened: If transport succeeds in establishing a connection.
    * closed: If transport fails to connect - `error` or `done` if there is no way to find whether the connection closed normally or not like when using the `sse` transport. If timed out - `timeout`.
    
* **opened**

    The connection is established successfully and communication is possible. The `open` event is fired. Heartbeat communication between the socket and the server starts if enabled. Accumulated events, which are sent when communication is not possible before this state, are sent to the server by the transport.
    
    Only in this state, the socket can send and receive events via connection to the server. Since the connection is shareable, if you have used the socket as data accesser like Ajax, synchronizing status of applications existing in other tabs or windows can be possible with only one connection.
    
    State transition occurs to
    * closed: If heartbeat communication fails or connection is disconnected - `error` or `done`.
    
* **closed**

    The connection has been closed, has been regarded as closed or could not be opened. The `close` event is fired with the close reason. If the `reconnect` handler is set to or returns `false`, the socket's life cycle ends here.
    
    Note that reinitializing occurs in the `preparing` state.
    
    State transition occurs to
    * waiting: If the `reconnect` handler returns a positive number.
    
* **waiting**

    The socket waits out the reconnection delay. The `waiting` event is fired with the delay and the attempts.
    
    State transition occurs to
    * preparing: After the reconnection delay.
    
**Event type**

From the semantic point of view, the unit of data to be sent and be received is the event, like the interaction between user and browser. The socket object's events can be classified like the following.

* **Pseudo event**

    They only exist in the client and have nothing to do with the server.

* **Network event**

    They are fired in process of connecting and disconnecting by the transport object.

* **Message event**

    They are sent and received via the connection effectively. Only this type of event can be extended. All the custom event used by the socket or the user belong to custom message event. 

### Event

#### `connecting()`

A pseudo event which is fired only once when a connection is tried.

#### `waiting(delay, attempts)`

A pseudo event which is fired only once when a reconnection has scheduled. 

* **delay** (type: Number): The reconnection delay in milliseconds.
* **attempts** (type: Number): The total number of reconnection attempts.

#### `open()`

A network event which is fired only once when a connection is established and communication is possible.

The `connecting` event becomes locked. An event handler registered when the state is not `opened` is executed when it becomes `opened` unless the open event is locked. An event handler added when the state is `opened` is executed immediately.

#### `close(reason)`

A network event which is fired once when a connection has been closed. 

* **reason** (type: String): The connection close reason. 
    * canceled: Preparation failure.
    * notransport: No available transport.
    * done: Closed normally.
    * aborted: Closed by the user.
    * timeout: Timed out.
    * error: Closed due to a server error or could not be opened.

The `connecting`, `open`, `message` and all the custom events become locked. An event handler registered when the state is not `closed` is executed when it becomes `closed`. An event handler added when the state is `closed` is executed immediately. 

#### `message(data, [callback])`

A message event which is fired multiple times when a message event has been received from the server. 

* **data** (type: Object): The data sent by the server. 
* **callback** (type: Function()): The callback for replying to the server. It is provided only if the event's `reply` property is `true` and receives a result of event handling to be sent to the server.

#### `heartbeat()`

A message event which is fired multiple times when a heartbeat event has been echoed back from the server.

#### `reply(info)`

A message event which is fired multiple times when a reply event has been received from the server.

* **info** (type: Object): The reply information is passed to event handlers and has three properties: 
    * id: The original event which requested reply
    * data: The reply of the server
    * exception: Tells there was exception and determines whether to invoke the done callback or the fail callback.

### Method

#### `option(key)`

Finds the value of an option from the options merged with the default options and the given options. 

* **key** (type: String): A key of option.

In addition to merged options, the following options are available:
* id: The socket id.
* url: The original url.

#### `data(key)`

Returns the connection-scoped data with the specified key. The connection scope is reset every time the socket opens.

* **key** (type: String): A key of stored data.

The followings are reserved data managed by the socket and internally used. Don't rely on them or use them with care.
* candidates: The transport candidates.
* transport: The transport name.
* url: The final url.
* broadcastable: The broadcaster for connection sharing.
* lastEventIds: The event ids contained by the previous message.
* data: An incomplete message text consisting of chunks. Used by `streamParser` option for `stream` transport.
* event: The original event object of `ws` transport's WebSocket and `sse` transport's EventSource.
* index: An index indicating where message text ends. Used by `streamxhr` and `streamxdr`.

#### `data(key, value)`

Stores the connection-scoped data with the specified key. The connection scope is reset every time the socket opens.

* **key** (type: String): A key of data to set.
* **value** (type: Object): The new data.

#### `state()`

Determines the current state of the socket.

#### `on(handlers)`

Adds event handlers from a given map of event type and event handler. Use this signature when initializing a socket. Actually, a single event handler is enough for most cases. When the handler executes, the `this` keyword refers to the socket where the event occurred.

* **handlers** (type: Object): A map of event name and event handler.

#### `on(event, handler)`

Adds a given event handler for a given event.

* **event** (type: String): An event name.
* **handler** (type: Function): An event handler. Arguments to be passed to the handler are determined by event type.

#### `off(event, handler)`

Removes a given event handler for a given event.

* **event** (type: String): An event name.
* **handler** (type: Function): An event handler to be unbound from the event.

#### `one(event, handler)`

Adds a given one time event handler for a given event. A handler bound by `one` can be called only once so it will not be reset upon reconnection.

* **event** (type: String): An event name.
* **handler** (type: Function): An event handler. Arguments to be passed to the handler are determined by event type.

#### `send(event, [data])`

Sends an event whose type is a given event and data is a given data to the server.

* **event** (type: String): An event name.
* **data** (type: Object): Data to be sent.

When the socket is in a state of connecting, if this method is called, data is stored and sent on the open event.

#### `send(event, [data], [doneCallback], [failCallback])`

Sends the event and registers callbacks. The reply event sent by the server determines whether to invoke the done callback or the fail callback. 

* **event** (type: String): An event name.
* **data** (type: Object): Data to be sent.
* **doneCallback**
     * (type: String): A callback event name to be fired with data returned from the server.
     * (type: Function(Object data)): A callback function to be invoked with data returned from the server.
* **failCallback**
     * (type: String): A callback event name to be fired with data returned from the server.
     * (type: Function(Object data)): A callback function to be invoked with data returned from the server.

When connection sharing is enabled, passing event name and passing function lead to totally different result. Through the former way, it is possible to share callback result but in case of the latter way, of course it can't be. So, in that situation, you have to consider what way is suitable. Also, you don't need to adopt the former if you will never enable connection sharing.

#### `close()`

Closes the socket.

#### `connecting(handler)`, `open(handler)`, `message(handler)`, `close(handler)`, `waiting(handler)`

A shortcut for `on(event, handler)` method.

## `transport`
A private interface that used to establish a connection, send data, receive data and close the connection.

**Full-duplex channel over HTTP**

Whereas the WebSocket is a protocol designed for a full-duplex communications over a TCP connection, the HTTP is just a protocol based on the request-response paradigm and has nothing to do with real-time characteristics. To simulate a full-duplex connection over HTTP, the following methods defined in `httpbase` transport are used to send data to the server in order.

* XMLHttpRequest: works if the given url is from same-origin or if the given url is from the cross-origin and the browser supports [`CORS`](http://caniuse.com/#search=cors).
* XDomainRequest: works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.
* Form element: always works but causes a clicking sound.

To receive data from the server, a.k.a. server-push, streaming and long polling are implemented. These mechanisms' definition and known issues are well-explained in [RFC 6202](http://tools.ietf.org/html/rfc6202). You should read it to choose a fallback's mechanism.

* Streaming: `sse`, `stream`, `streamxhr`, `streamxdr`, `streamiframe`.
* Long polling: `longpoll`, `longpollajax`, `longpollxdr`, `longpolljsonp`.

### Implementation
The following implementations are ready to use.

#### `ws`

WebSocket. Works if the browser supports [`WebSocket`](http://caniuse.com/#search=websocket). After the `open`, `message`, `close` and all the custom event, it's possible to access a used WebSocket's original event by calling `.data('event')`.

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

#### `longpoll`

Means the `longpollajax`, `longpollxdr` and `longpolljsonp`. 

#### `longpollajax`

AJAX long polling. Works if the given url is from same-origin or if the given url is from the cross-origin and the browser supports [`CORS`](http://caniuse.com/#search=cors).

#### `longpollxdr`

XDomainRequest long polling. Works if the browser supports `XDomainRequest` and the `.options.xdrURL(url)` returns a appropriate url.

#### `longpolljsonp` 

JSONP long polling. Works without qualification, but disconnection is not detected.
