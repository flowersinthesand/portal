---
layout: documentation
title: Getting started
---

# Getting started

---

## Install

### As browser client

Download portal.js the way you want.

<ul class="inline-list">
<li><a href="https://raw.github.com/flowersinthesand/portal/1.1.1/portal.min.js">The compressed</a></li>
<li><a href="https://raw.github.com/flowersinthesand/portal/1.1.1/portal.js">The uncompressed</a></li>
<li><code>bower install portal</code></li>
</ul>

Though there may be delays between a release and its availability, portal.js is available in the following ways

<ul class="inline-list">
<li><a href="http://cdnjs.com/libraries/portal">CDNJS CDN</a></li>
<li><a href="http://search.maven.org/#search%7Cgav%7C1%7Cg%3A%22org.webjars%22%20AND%20a%3A%22portal%22">WebJars</a></li>
</ul>

Then load it by using either script tag or AMD loader.

<div class="row">
<div class="large-6 columns">
{% capture panel %}
**Script tag**

```html
<script src="/portal/portal.min.js"></script>
<script>
portal.open("/test");
</script>
```
{% endcapture %}{{ panel | markdownify }}
</div>
<div class="large-6 columns">
{% capture panel %}
**AMD loader**

```javascript
require(["portal"], function(portal) {
    portal.open("/test");
});
```
{% endcapture %}{{ panel | markdownify }}
</div>
</div>

### As Node.js client

portal.js is available on [npm](https://npmjs.org/package/portal-client) under the name of `portal-client`. There are differences in many ways between browser and Node.js. Because browser is first runtime engine of portal.js, you should check if there is note for Node.js browsing docs.

Add `portal-client` to your `package.json` and install the dependencies. If you are on Windows, you may have trouble in installing Contextify. See a [installation guide](https://github.com/tmpvar/jsdom#contextify) from jsdom.
  
```bash
npm install
```

Then load it as a Node.js module.

```javascript
var portal = require("portal-client");
portal.open("http://localhost:8080/test");
```

---

## Prepare server

Officially the following portal server is available:

* [Portal for Java](http://flowersinthesand.github.io/portal-java/)

Or you can write your own server easier than expected. See [writing server]({{ site.baseurl }}/documentation/1.1.1/writing-server/). If you just want to try out portal, you can use a test server written only to run test suite. Follow instructions in [README](https://github.com/flowersinthesand/portal/blob/master/README.md#test-suite).

---

## Play

It's time to play.

#### Realtime event channel

Socket provided by portal is an realtime event channel between portal client and server. Server and client can send and receives events to each other.

```javascript
portal.open("/portal").on({
    // Pseudo event
    connecting: function() {}, // The selected transport starts connecting to the server
    waiting: function(delay, attempts) {}, // The socket waits out the reconnection delay
    // Network event
    open: function() {}, // The connection is established successfully and communication is possible
    close: function(reason) {}, // The connection has been closed or could not be opened
    // Message event
    message: function(data) {}, // Receive an event whose name is message sent by the server
    event: function(data) {} // Receive an event whose name is event sent by the server
})
.send("greeting", "Hi"); // Send an event whose name is 'greeting' and data is 'Hi' to the server
```

#### Socket on Web for All

Considering the real world, many coporate proxies, firewalls, antivirus softwares and cloud application platforms block WebSocket and some HTTP transports or servers can't detect disconnection or close connection.

```javascript
portal.open("/portal", {
    heartbeat: true,
    notifyAbort: true,
    prepare: function(connect, cancel, options) {
        // Assume that the server returns the best transports for client
        // Transport negotiation or its guide will be introduced in later 
        $.ajax("/portal/negotiation").done(function(transports) {
            // Modify transport set and connects to the server
            options.transports = trnasports;
            connect();
        });
    }
});
```

#### Connection sharing

It's common case that user opens multiple tabs of same website and each tab have its persistent connection like portal. In the case of a web portal consisting of many portlets, if portlet has a persistent connection, it can't send any request, receive and display anything in violation of the simultaneous connection limit. By sharing a connection, it can be avoided.

```javascript
// Sockets using shared connection are considered as a single client to the server
// More extended options will be provided later  
portal.open("/portal", {sharing: true});
```

#### Remote Procedure Call (RPC)

Socket can play a role of RPC client. Nothing new to traditional Ajax, but comparing to Ajax, WebSocket can reduce unnecessary traffic and the result can be shared by multiple tabs and windows. Building a web application with portal is a good way to create a economical webapp.

```javascript
portal.open("/portal")
// If the server requests
.on("user:stat", function(data, reply) {
    // The client can respond with data
    reply(user.stat);
})
// If the client requests
.send("account:find", {id: "flowersinthesand"}, function(account) {
    // The server can respond with data
    console.log(account);
});
```

#### Customization

For some reason, you may want to or have to check authorization, perform handshake, handle low-level payload, build URL in REST format, use server-generated socket id and customize everything. Various options support to do that.

```javascript
portal.open("/portal", {
    // Prepare something before connecting
    prepare: function(connect, cancel, options) {},
    // Convert raw string sent by the server to event object
    inbound: function(data) {},
    // Convert event object to raw string to be sent to the server
    outbound: function(event) {},
    // Build URL to be used by socket
    urlBuilder: function(url, params, when) {},
    // Generate a socket id
    idGenerator: function() {},
    // Determine reconnection delay
    reconnect: function(lastDelay, attempts) {},
    // Modify URL for XDomainRequest
    xdrURL: function(url) {},
    // Parse stream response and find stringified event
    streamParser: function(chunk) {}
});
```