## Browser support
The policy for browser support is the same with the one of jQuery 1.x.

* Internet Explorer: 6+
* Chrome: (Current - 1) or Current
* Firefox: (Current - 1) or Current	
* Safari: 5.1+
* Opera: 12.1x, (Current - 1) or Current

In like manner, (Current - 1) or Current indicates that current stable version of the browser and the version that preceded it. Contrary to jQuery, in portal, supporting Internet Explorer 6, 7 and 8 almost never contributes to the performance penalty, yet increase size of code.

## Transport availability
The following list of transports have been tested with 1.0 and each given browser, and <font color="#cc0000">red colored</font> transports are recommended. Note that some old browsers supporting `ws` implement old WebSocket protocol like hixie-76, therefore in order to support them, the server has to be able to support those protocols.

### Firefox
#### 11
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`

`ws`: 11 supports [rfc6455](http://tools.ietf.org/html/rfc6455)

#### 6
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

`ws`: 7 supports [hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10) and 6 supports [hybi-07](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07)

#### 3.6
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

#### 3
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`longpolljsonp`</font>

### Chrome
#### 10
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

`ws`: 16 supports [rfc6455](http://tools.ietf.org/html/rfc6455), 14 supports [hybi-10](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-10)

#### 6
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

`ws`: 6 supports [hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76)

#### 5
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

`ws`: 5 supports [hixie-75](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-75)

#### 3
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

#### 2
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

### Internet Explorer
#### 10
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `streamxdr`, `streamiframe`, `longpollajax`, `longpollxdr`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `streamxdr`, `longpollajax`, `longpollxdr`, `longpolljsonp`

`ws`: 10 supports [rfc6455](http://tools.ietf.org/html/rfc6455)<br />
`streamiframe`: not supported in 10 Metro

#### 8
* same origin - <font color="#cc0000">`streamxdr`</font>, <font color="#cc0000">`streamiframe`</font>, `longpollajax`, `longpollxdr`, `longpolljsonp`
* cross origin - <font color="#cc0000">`streamxdr`</font>, `longpollxdr`, <font color="#cc0000">`longpolljsonp`</font>

`streamxdr` and `longpollxdr`: disabled by default because XDomainRequest doesn't send any cookies.

#### 6
* same origin - <font color="#cc0000">`streamiframe`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`longpolljsonp`</font>

### Safari
#### 5.1
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

`ws`: 5.0.1 supports [hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76)

#### 5.0.1
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

`ws`: 5.0.1 supports [hixie-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76)

#### 4.0
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

#### 3.1
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`

### Opera
#### 12.10
* same origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`ws`</font>, <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`

`ws`: 12.10 supports [rfc6455](http://tools.ietf.org/html/rfc6455)

#### 12
* same origin - <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`

#### 11.60
* same origin - <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`longpolljsonp`</font>

#### 11.0
* same origin - <font color="#cc0000">`sse`</font>, `streamxhr`, `longpollajax`

#### 10.0
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`

### Android
#### 2.1
* same origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`
* cross origin - <font color="#cc0000">`streamxhr`</font>, `longpollajax`, `longpolljsonp`