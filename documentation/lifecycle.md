# Life cycle

## State
Socket always is in a specific state. According to the status of connection to the server, transition between states occurs and this circulating transition makes a life cycle. The following list is a list of state which a socket can be in.

### preparing
As an initial state of life cycle, the `preparing` state gives opportunity to prepare physical connection establishment. If the `sharing` options is `true` and there is a shared connection or unless the `prepare` handler is newly set, this state will be skipped so that there is no relevant event for this state. In this state, the socket is initialized.

When you need to work with the server before connecting like overriding options, handshaking and authenticating user, you can do that in `preparing` state using `prepare` handler.

State transition occurs to
* connecting: If `prepare` handler's `connect` function is executed. The default `prepare` handler executes `connect` function simply.
* closed: If `prepare` handler's `cancel` function is executed - `canceled`. if there is no available transport in `transports` option under given options and situation - `notransport`.

### connecting
The selected transport starts connecting to the server and the `connecting` event is fired. Timer for time-out is activated, environment for connection sharing is constructed and the socket starts to share its connection if corresponding options allow to do that.

The `connecting` event is an initial event which the socket fires, so that you can set session-scoped value to initialize or configure application in connecting event handlers.

State transition occurs to
* opened: If transport succeeds in establishing a connection.
* closed: If transport fails to connect - `error` or `done` if there is no way to find whether the connection closed normally or not like when using the `sse` transport. If timed out - `timeout`.

### opened
The connection is established successfully and communication is possible. The `open` event is fired. Heartbeat communication between the socket and the server starts if enabled. Accumulated events, which are sent when communication is not possible before this state, are sent to the server by the transport.

Only in this state, the socket can send and receive events via connection to the server. Since the connection is shareable, if you have used the socket as data accesser like Ajax, synchronizing status of applications existing in other tabs or windows can be possible with only one connection.

State transition occurs to
* closed: If heartbeat communication fails or connection is disconnected - `error` or `done`.

### closed
The connection has been closed, has been regarded as closed or could not be opened. The `close` event is fired with the close reason. If the `reconnect` handler is set to or returns `false`, the socket's life cycle ends here.

Note that reinitializing occurs in the `preparing` state.

State transition occurs to
* waiting: If the `reconnect` handler returns a positive number.

### waiting
The socket waits out the reconnection delay. The `waiting` event is fired with the delay and the attempts.

State transition occurs to
* preparing: After the reconnection delay.

## Events
From the semantic point of view, the unit of data to be sent and be received is the event, like the interaction between user and browser. The socket object's events can be classified like the following. Each signature in parentheses corresponds to each event handler's signature.

### Pseudo event
They only exist in the client and have nothing to do with the server.

#### `connecting()`

Fired once when a connection is tried.

#### `waiting(delay, attempts)`

Fired once when a reconnection has scheduled. The delay in milliseconds and the total number of reconnection attempts are passed to event handlers.

### Network event
They are fired in process of connecting and disconnecting by the transport object.

#### `open()`

Fired once when a connection is established and communication is possible. The `connecting` event becomes locked.

#### `close(reason)`

Fired once when a connection has been closed. The `connecting`, `open`, `message` and all the custom events become locked. The connection close reason is passed to event handlers. It can have the following values: `canceled`(preparation failure), `notransport`(no available transport), `done`(closed normally), `aborted`(closed by the user), `timeout`(timed out) and `error`(closed due to a server error or could not be opened).

### Message event
Effectively, they are sent and received via the connection. The socket object uses several custom events to support additional functions. Such reserved custom events cannot be used artificially.

#### `message(data, [callback])`

Fired multiple times when a message event has been received from the server. The data sent by the server and the callback for replying to the server are passed to event handlers. That callback is provided only if the event's `reply` property is `true` and receives a result of event handling to be sent to the server. The custom event is actually the custom message event, so it can be fired multiple times and receives data and callback as argument in the same way as the `message` event.

#### `heartbeat()`

Fired multiple times when a heartbeat event has been echoed back from the server.

#### `reply(info)`

Fired multiple times when a reply event has been received from the server. The reply information is passed to event handlers and has three properties: `id` of the original event which requested reply, `data` which is reply of the server and `exception` which tells there was exception and determines whether to invoke the done callback or the fail callback.