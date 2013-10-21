---
layout: documentation
title: Home
---

# Welcome

The **Portal** is a concise, lightweight and feature-rich JavaScript library for real-time web application development. The <strong>Portal</strong> provides socket for browser-based applications that need two-way communication with servers, but also aims to utilize a full duplex connection for modern web application development.

The **Portal** greatly simplifies things essential to real-time web applications like connection sharing, reply, heartbeat and disconnection detection. The <strong>Portal</strong> is designed by carefully considering known issues and best practices of real-time web to provide a reliable socket based on its simple protocol.

## Features
* **Server agnostic**.
  * Protocol is concise and simple.
  * All you need to integrate in the server-side is to write and read some HTTP messages and JSON.
* **Full-duplex**.
  * Server-Sent Events, Streaming and Long polling are supported considering their known issues as well as WebSocket.
* **Event-driven**.
  * The semantic unit to be sent and be received via socket is the event.
  * Every event is an entry point for business-related logic, and its handler is a reusable unit of work. 
* **Connection sharing**.
  * Connection can be shared and used across multiple tabs and windows as long as browser session is alive.
* **Reply**.
  * It is possible to set a callback that will be executed with data by the server, and vice versa.
* **Heartbeat**.
  * It checks that connection is alive or not regularly regardless of transport, server and protocol.
* **Lightweight**.
  * The portal.min.js 1.0.1 takes only 7.06KB gzipped (20.68KB uncompressed). Compare it to others.