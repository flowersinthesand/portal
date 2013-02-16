# Portal
The **Portal** is a server agnostic JavaScript library that not just provides a socket for browser-based applications that need two-way communication with servers, but also aims to utilize a full duplex connection for modern web application development.

There is the **Portal for Java** project which is a reference implementation of the server counterpart written in Java. Look at it to implement a portal server in other languages. Sample applications are available in each server counterpart project.

The **Portal** and **Portal for Java** project is developed and maintained by [Donghwan Kim](http://twitter.com/flowersits). If you are interested, please subscribe to the [discussion group](https://groups.google.com/d/forum/portal_project).

## How to use
Load portal.js to your application:
```html
<script src="/portal/portal.js"></script>
```

Then, open a connection to the Portal server.
```html
<script>
portal.open("/portal").on({
    // Pseudo event
    connecting: function() {},
    waiting: function(delay, attempts) {},
    // Network event
    open: function() {},
    close: function(reason) {},
    // Message event
    message: function(data) {},
    eventname: function(data) {}
});
</script>
```

## Server
* [Portal for Java](https://github.com/flowersinthesand/portal-java)


## Documentation
* [API](https://github.com/flowersinthesand/portal/wiki/API)
* [Features](https://github.com/flowersinthesand/portal/wiki/Features)
* [Socket Life Cycle and Events](https://github.com/flowersinthesand/portal/wiki/Socket-Life-Cycle-and-Events)
* [Supported Transports and Browsers](https://github.com/flowersinthesand/portal/wiki/Supported-Transports-and-Browsers)
* [Browser Quirks](https://github.com/flowersinthesand/portal/wiki/Browser-Quirks)
* [Server Side Processing](https://github.com/flowersinthesand/portal/wiki/Server-Side-Processing)
