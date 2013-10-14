# Quirks
Explanation and workaround for various browser quirks.

### The browser limits the number of simultaneous connections

Applies to: HTTP connection

According to the [HTTP/1.1 spec](http://tools.ietf.org/html/rfc2616#section-8.1.4), a single-user client should not maintain more than 2 connections. This restriction actually [varies with the browser](http://stackoverflow.com/questions/985431/max-parallel-http-connections-in-a-browser). If you consider multiple topics to subscribe and publish, utilize the custom event in a single connection.

```js
// portal.open("/chat").message(fn1).send("message", data1);
// portal.open("/dm").message(fn2).send("message", data2);
portal.open("/events")
.on("chat", fn1).send("chat", data1)
.on("dm", fn2).send("dm", data2);
```

### Pressing ESC key aborts the connection

Applies to: Firefox

One of default behaviors of pressing ESC key in Firefox is to cancel all open networking requests fired by `XMLHttpRequest`, `EventSource`, `WebSocket` and so on. The workaround is to prevent that behavior, and its drawback is that the user can't expect the default behavior of pressing ESC key.

```js
$(window).keydown(function(event) {
    if (event.which === 27) {
        event.preventDefault();
    }
});
```

### The unload event causes the browser to open a second connection when refreshing page

Applies to: Firefox

Many libraries like this use the unload event to finalize sockets to notify the server of disconnection. Without this measure, the server could keep connections alive and the browser could leak memory. It depends on the server, the browser, and the transport. Anyway, I'm not sure about the condition causing this issue to arise. If you suffer from this, use the beforeunload event instead of the unload event. Note, however, that [the actual goal of the beforeunload event](http://dev.w3.org/html5/spec-LC/history.html#unloading-documents) is to give the user an opportunity to navigate away the page or not so that closing sockets on beforeunload event consequently ignores the user's decision. So use this way only when your application doesn't make use of the beforeunload event. Also, in Internet Explorer, clicking an anchor element whose href attribute starts with the `javascript:` pseudo-protocol [dispatches beforeunload event](http://jsfiddle.net/BSf33/).

```js
$(window).on("beforeunload", function() {
    portal.finalize();
});
```

### Sending an event emits a clicking sound

Applies to: cross-origin HTTP connection on browsers not supporting CORS

If the given url is cross-origin and the browser doesn't support Cross-Origin Resource Sharing such as Internet Explorer 6, an invisible form element is used to send data to the server. Here, a clicking sound occurs every time the form is submitted and there is no workaround so far.

### A blank page pops up when there is a shared connection

Applies to: Internet Explorer whose version is higher than `8.0.7601.17514` and lower than `9.0`

When `shared` option is `true`, if there is trace of a shared connection, new sockets try to utilize it. In doing this, some Internet Explorer versions don't allow to access other windows so that a [blank page](http://skitch.com/jfarcand/eaa13/screen-shot-2012-10-11-at-2.20.30-pm) pops up instead of getting a reference to targeted window. No workaround.