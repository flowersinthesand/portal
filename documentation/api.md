`portal` is the feature-rich and flexible interface for two-way communication.

## portal
### `portal.open(url, [options])`

Creates a new socket with the given options, connects to the given url and returns it.

### `portal.find()`

Returns the first socket.

### `portal.find(url)`

Returns the socket object which is mapped to the given url, or null if there is no corresponding one.

### `portal.finalize()`

Closes all sockets and removes all their traces.

## Options
### `transports`

An array of the transport ids, in order of index. The transport is used to establish a connection, send data and close the connection. The default is `["ws", "sse", "stream", "longpoll"]`. For details, see [[Supported Transports and Browsers]].

```js
{transports: ["sse", "stream"]};
```

### `timeout`

A timeout value in milliseconds. The timeout timer starts at the time the `connecting` event is fired. If the timer expires before the connection is established, the `close` event is fired. The default is `false`, which means no timeout.

```js
{timeout: 5000};
```

### `heartbeat`

A heartbeat interval value in milliseconds. A opened socket continuously sends a heartbeat event to the server each time the value has elapsed. Actually, the socket sends the event 5 seconds before the heartbeat timer expires to wait the server's echo. If the event echoes back within 5 seconds, the socket reset the timer. Otherwise, the `close` event is fired. For that reason, the value must be larger than `5000` and the recommended value is `20000`. The default is `false`, which means no heartbeat.

```js
{heartbeat: 20000};
```

### `lastEventId`

A initial value for the last event id to be passed to the `urlBuilder` function. The default is `0`.

```js
{lastEventId: window.localStorage && window.localStorage["eventId"] || 0};
```

### `sharing`

A flag indicating that sharing socket across tabs and windows is enabled or not. If this is turned on, as long as the cookie is enabled, the socket object will try to automatically share a real connection if there is no corresponding one, and find and use a shared connection if it exists within the cookie's scope. Windows don't need to have any parent window. By default, the value is set to `false`.

```js
{sharing: true};
```

### `prepare(connect, cancel, options)`

A function that is called before the socket tries to connect and determines whether to allow the socket to try to connect or not when a physical connection is needed. In other words, if the option `sharing` is `true` and there is an available shared socket, the function will not be executed. The function receives three arguments: The callback to connect, the callback to cancel and merged options object. You can use this when the opening handshake is needed, the user is needed to be authenticated and the option is needed to be managed by the server. The default function simply executes the connect function.

```js
{
    prepare: function(connect, cancel, options) {
        $.ajax("/socket-prepare").done(function(data) {
            options.id = data.id;
            options.transports = data.transports;
            options.timeout = data.timeout;
            options.heartbeat = data.heartbeat;
            connect();
        })
        .fail(function() {
            cancel();
        });
    }
};
```

### `reconnect(lastDelay, attempts)`

A function to be used to schedule reconnection. The function is called every time after the `close` event is fired and should return a delay in milliseconds or `false` not to reconnect. The function receives two arguments: The last delay in milliseconds used or `null` at first and the total number of reconnection attempts. This can be disabled by setting the value to `false`. The default function returns 500 at first and then the double of the last delay of each call.

```js
{
    reconnect: function(lastDelay, attempts) {
        return attempts > 10 ? false : 2 * (lastDelay || 250);
    }
};
```

### `idGenerator()`

A function to be used to generate a socket id. The function should return a string and the returned string should be unique enough for the server to use it as a identifier of the connection until the connection disconnects. The default function generates a random UUID.

```js
{
    idGenerator: function() {
        return Math.random().toFixed(20).substring(2);
    }
};
```

### `urlBuilder(url, params, when)`

A function to be used to build an url within specific goal. The function should return an effective url including the given parameters. The function accepts three arguments: The absolute form of the given url, the params object according to the purpose and the purpose of request. The default function appends a query string representation of the `when` and the `params` to the url.

`when` can be one of the following values

* `open`: to establish a connection.  The params has `id`, `transport`, `heartbeat`, `lastEventId` and `_` for anti-caching. Additionaly if the transport is `longpolljsonp`, `callback` is also included to the params.
* `poll`: In the long polling, the `when` of first request is `open` and that of further requests are `poll`. The params has `id`, `transport`, `lastEventIds` and `_` for anti-caching. Additionaly if the transport is `longpolljsonp`, `callback` is also included to the params.
* `abort`: to notify the server of disconnection. The params has `id` and `_` for anti-caching.

```js
{
    urlBuilder: function(url, params, when) {
        var path = [when, params.id, params.transport, params.heartbeat, params.lastEventId].join("/");
        return url.replace(/(\?)(.*)|$/, "/" + path + "$1$2"));
    }
};
```

### `params`

An additional parameters to be merged with the default parameters and passed to the `urlBuilder` function. The first-depth property's name should be the one of the possible `when`. Functions will be called with no arguments.

```js
{
    params: {
        open: {
            id: "overriding the id parameter",
            key: function() {
                return "value";
            }
        },
        abort: {
            now: function() {
                return Date.now();
            }
        }
    }
};
```

### `inbound(data)`

A function to be used to convert data sent by the server into an event object. Every data sent by the server except binary invokes the function and it should return an event object having `type`. Binary data is considered as a `message` event instead. The event object can have the following optional properties: `id`(an event id), `reply`(if true then a reply event will be sent) and `data`(the first argument of corresponding handlers). The default function parses the data as JSON and returns the parsed value because the server sends a JSON string representing the event as data by default.

```js
{
    inbound: function(data) {
        if (data === "h") {
	    return {type: "heartbeat"};
	}

        return JSON.parse(data);
    }
};
```

### `outbound(event)`

A function to be used to convert an event object into data to be sent to the server. Every data to be sent to the server except binary invokes the function and it should return a string. Binary data is sent as it is instead. The given event object has `id`(an event id), `type`(a event type which the user input), `reply`(if true then a reply event will be received), `socket`(a socket id) and `data`(data which the user input) properties. The default function serializes the event object into JSON and returns it because the server accepts a JSON string representing the event as data by default.

```js
{
    outbound: function(event) {
        if (event.type === "heartbeat") {
	    return "h";
	}

        return JSON.stringify(event);
    }
};
```

## Transport options

### `notifyAbort`

Applied to: Every transport based on the `http` protocol

This option helps the server detect disconnection of HTTP connection when the server does not support to detect disconnection. If it's `true`, when the `close` method is called, simple HTTP GET request whose url is generated by `urlBuilder` with the abort `when`. By default, the value is set to `false`.

```js
{notifyAbort: true};
```

### `credentials`

Applied to: `sse`, `stramxhr`, `longpollajax` in the browser supporting [Cross-Origin Resource Sharing](http://www.w3.org/TR/cors/)

If the value is `true`, user credentials such as cookies and HTTP authentication is to be included in a cross-origin connection. The spec requires the server to add some [response headers](http://www.w3.org/TR/cors/#resource-requests). The default is `false`

```js
{credentials: true};
```
<!--
### `longpollTest`

Applied to: `longpollajax`, `longpollxdr`, `longpolljsonp`

By default, the first long polling request is supposed to be complete instantly to confirm that the server is alive and fire the `open` event. If the value is set to `false`, this test is skipped and the `open` event is fired regardless of the server's status.

```js
{longpollTest: false};
```
-->
### `xdrURL(url)`

Applied to: `streamxdr`, `longpollxdr`

A function that can be used to modify a url to be used by the `XDomainRequest`. For security reasons, the `XDomainRequest` excludes cookies when sending a request, so a session state cannot be maintained. This problem can be solved by rewriting the url to contain session information. How to rewrite the url is depending on the server app. For details, see my [Q&A](http://stackoverflow.com/questions/6453779/maintaining-session-by-rewriting-url) on StackOverflow. If you wish to disable applied transports, set the value to `false`. The default function modifies the url only if `JSESSIONID` or `PHPSESSID` cookie exists. For example, If the url is `url?key=value` and `JSESSIONID` cookie exists, the url becomes `url;jsessionid=${cookie.JSESSIONID}?key=value`, and if `PHPSESSID` cookie exists, the url becomes `url?PHPSESSID=${cookie.PHPSESSID}&key=value`. Otherwise, it returns `false`.

```js
{
     xdrURL: function(url) {
          var match = /(?:^|;\s*)JSESSIONID=([^;]*)/.exec(document.cookie);
          return match ? url.replace(/;jsessionid=[^\?]*|(\?)|$/, ";jsessionid=" + match[1] + "$1") : url;
     }
};
```

### `streamParser(chunk)`

Applied to: `streamxhr`, `streamiframe`, `streamxdr`

A function to parse stream response to find data from chunks. The function receives [chunk](http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.6.1) and should return an array of data and the returned array's length varies with each chunk because a single chunk may contain a single data, multiple data or a fragment of a data. The default function parses a chunk according to the [event stream format](http://www.w3.org/TR/eventsource/#parsing-an-event-stream), but deals with the data field only.

```js
{
    streamParser: function(chunk) {
        var data = chunk.split(";");
        
        data[0] = (this.data("data") || "") + data[0];
        this.session("data", data[data.length - 1]);
        
        return data.slice(0, data.length - 1);
    }
};
```

## Methods
### `option(key)`

Finds the value of an option from the options merged with the default options and the given options. `.option("id")` returns the socket id and `.option("url")` returns the original url.

```js
portal.find().option("url");
```

### `data(key, [value])`

Gets or sets the connection-scoped value with the specified key. The connection scope is reset every time the socket opens.

```js
portal.find().data("url");
```

### `state()`

Determines the state of the socket. It can be in one of five states: `preparing`, `connecting`, `opened`, `closed` and `waiting`.

```js
portal.find().state();
```

### `on(handlers)`

Adds event handlers from a given map of event type and event handler. Use this signature when initializing a socket. Actually, a single event handler is enough for most cases. When the handler executes, the `this` keyword refers to the socket where the event occurred. 

```js
portal.open("events").on({
    message: function() {
        this.data("counts", (this.data("counts") || 0) + 1);
    }
});
```

### `on(event, handler)`

Adds a given event handler for a given event.

```js
portal.find().on("message", function() {
    this.data("counts", (this.data("counts") || 0) + 1);
});
```

### `off(event, handler)`

Removes a given event handler for a given event.

```js
portal.find().off("notification", app.handleNotification);
```

### `one(event, handler)`

Adds a given one time event handler for a given event. A handler bound by `one` can be called only once in a socket life cycle. In other words, the handler will not be reset upon reconnection.

```js
portal.find().one("message", function() {
    alert("first message!");
});
```

### `send(event, [data], [doneCallback], [failCallback])`

Sends an event whose type is a given event and data is a given data to the server. 

```js
portal.find()
.send("signal")
.send("event", {foo: "bar"});
```

If a callback is string, it is regarded as the callback event name and that event will be fired with data returned from the server, if a callback is function, it will be invoked with the data. The reply event sent by the server determines whether to invoke the done callback or the fail callback. Note that passing function is not shareable.

```js
portal.find()
.send("account:add", {username: "flowersinthesand"}, "account:add:done", "account:add:fail");
// Use this way only if the reply result doesn't need to be shared
.send("account:find", 45, function(account) {
    // ...
});
```
<!--
### `fire(event, [data])`

Fires all event handlers attached to the local socket for the given event type.

```js
portal.find()
.fire("init")
.fire("account.added", {username: "flowersinthesand", twitter: "flowersits"});
```

### `broadcast(event, [data])`

Broadcasts an event to session sockets which means a socket sharing its connection and sockets connecting to that connection.

```js
portal.find()
.broadcast("ready")
.broadcast("notification", {type: "success", msg: "Well done!"});
```
-->
### `close()`

Closes the socket.

```js
portal.find().close();
```

### `connecting(handler)`, `open(handler)`, `message(handler)`, `close(handler)`, `waiting(handler)`

A shortcut for `on(event, handler)` method.