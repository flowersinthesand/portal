# Portal
The **Portal** is a server agnostic JavaScript library that not just provides a socket for browser-based applications that need two-way communication with servers, but also aims to utilize a full duplex connection for modern web application development.

The **Portal** project is licensed under the [Apache License 2.0](http://www.tldrlegal.com/l/APACHE2) and developed and maintained by Donghwan Kim. If you are interested, please follow [@flowersits](https://twitter.com/flowersits) and subscribe to the [discussion group](https://groups.google.com/d/forum/portal_project).

## How to use
Load portal.js to your application:
```html
<script src="/portal/portal.js"></script>
```

Then, open a connection to the portal server.
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
    eventname: function(eventdata) {}
});
</script>
```