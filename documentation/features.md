### Server agnostic
Any web app using the portal can work on any server. All you need to integrate in the server-side is to meet transport prerequisite, write and read some JSON. If you don't like default protocol, you can always implement and use your own protocol. The portal is flexible enough to accept other protocols.

### Full-duplex
To provide realtime experience on every browser, various transports such as WebSocket, Server-Sent Events, streaming and long polling are ready to open. They are separated from the socket API, and mimic the full-duplex nature of the ultimate solution of two-way communication, WebSocket.

### Event-driven
The semantic unit to be sent and be received via socket is the event. Every event is an entry point for business-related logic, and every event handler is a reusable unit of work. With this architecture and event-driven programming model, you can build an understandable and easy to maintain real-time application.

### Connection sharing
Socket can be shared and used across multiple tabs and windows as long as browser session is alive. If the shared socket closes, the other socket will connect and share itself. In many cases, it will help reduce unnecessary network traffic.

### Reply
When result data is needed as result of event handling like response of HTTP request and acknowledgement of receipt of event is needed, when sending event, you can bind callback function or callback event name to be fired with data returned from the server. Using this feature, you can enhance reusability of business logic.

### Heartbeat
Some transports and servers can't detect disconnection so that applications use a connection time-out to prevent unnecessary network traffic. Heartbeat checks that connection is alive or not regularly. With heartbeat support, you can work with persistent connection without time-out and achieve a stable connection.

### Lightweight
Comparing to similar projects, the portal is quite lightweight. socket.io.min.js of 0.9.16 is 13.5KB gzipped (43.76KB uncompressed) and sockjs.min.js of 0.3.4 is 11.02KB gzipped (33.1KB uncompressed), whereas portal.min.js of 1.0.1 is only 7.06KB gzipped (20.68KB uncompressed).