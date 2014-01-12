---
layout: documentation
title: Socket
---

# `socket`
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

---

## Event

### `connecting()`

A pseudo event which is fired only once when a connection is tried.

### `waiting(delay, attempts)`

A pseudo event which is fired only once when a reconnection has scheduled. 

* **delay** (type: Number): The reconnection delay in milliseconds.
* **attempts** (type: Number): The total number of reconnection attempts.

### `open()`

A network event which is fired only once when a connection is established and communication is possible.

The `connecting` event becomes locked. An event handler registered when the state is not `opened` is executed when it becomes `opened` unless the open event is locked. An event handler added when the state is `opened` is executed immediately.

### `close(reason)`

A network event which is fired once when a connection has been closed. 

* **reason** (type: String): The connection close reason. 
    * canceled: Preparation failure.
    * notransport: No available transport.
    * done: Closed normally.
    * aborted: Closed by the user.
    * timeout: Timed out.
    * error: Closed due to a server error or could not be opened.

The `connecting`, `open`, `message` and all the custom events become locked. An event handler registered when the state is not `closed` is executed when it becomes `closed`. An event handler added when the state is `closed` is executed immediately. 

### `message(data, [callback])`

A message event which is fired multiple times when a message event has been received from the server. 

* **data** (type: Object): The data sent by the server. 
* **callback** (type: Function()): The callback for replying to the server. It is provided only if the event's `reply` property is `true` and receives a result of event handling to be sent to the server.

### `heartbeat()`

A message event which is fired multiple times when a heartbeat event has been echoed back from the server.

### `reply(info)`

A message event which is fired multiple times when a reply event has been received from the server.

* **info** (type: Object): The reply information is passed to event handlers and has three properties: 
    * id: The original event which requested reply
    * data: The reply of the server
    * exception: Tells there was exception and determines whether to invoke the done callback or the fail callback.

---

## Method

### `option(key)`

Finds the value of an option from the options merged with the default options and the given options. 

* **key** (type: String): A key of option.

In addition to merged options, the following options are available:
* id: The socket id.
* url: An absolute url of the original url.

### `data(key)`

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

### `data(key, value)`

Stores the connection-scoped data with the specified key. The connection scope is reset every time the socket opens.

* **key** (type: String): A key of data to set.
* **value** (type: Object): The new data.

### `state()`

Determines the current state of the socket.

### `on(handlers)`

Adds event handlers from a given map of event type and event handler. Use this signature when initializing a socket. Actually, a single event handler is enough for most cases. When the handler executes, the `this` keyword refers to the socket where the event occurred.

* **handlers** (type: Object): A map of event name and event handler.

### `on(event, handler)`

Adds a given event handler for a given event.

* **event** (type: String): An event name.
* **handler** (type: Function): An event handler. Arguments to be passed to the handler are determined by event type.

### `off(event, handler)`

Removes a given event handler for a given event.

* **event** (type: String): An event name.
* **handler** (type: Function): An event handler to be unbound from the event.

### `one(event, handler)`

Adds a given one time event handler for a given event. A handler bound by `one` can be called only once so it will not be reset upon reconnection.

* **event** (type: String): An event name.
* **handler** (type: Function): An event handler. Arguments to be passed to the handler are determined by event type.

### `send(event, [data])`

Sends an event whose type is a given event and data is a given data to the server.

* **event** (type: String): An event name.
* **data** (type: Object): Data to be sent.

When the socket is in a state of connecting, if this method is called, data is stored and sent on the open event.

### `send(event, [data], [doneCallback], [failCallback])`

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

### `close()`

Closes the socket.

### `connecting(handler)`, `open(handler)`, `message(handler)`, `close(handler)`, `waiting(handler)`

A shortcut for `on(event, handler)` method.
