---
layout: documentation
title: Getting started
---

# Getting started

## Install

### As browser client

Download portal.js and copy it to your static assets folder, or portal server may do that for you. If you use a script tag whose src attribute is set to one of the below one, browser may not load it because the content type served by raw.github.com is text/plain.

* [portal v1.1.0 compressed](https://raw.github.com/flowersinthesand/portal/1.1.0/portal.min.js)
* [portal v1.1.0 uncompressed](https://raw.github.com/flowersinthesand/portal/1.1.0/portal.js)

Also portal.js is available in the following ways, but there may be delays between a release and its availability.

* [CDNJS CDN](http://cdnjs.com/libraries/portal)
* [WebJars](http://search.maven.org/#search%7Cgav%7C1%7Cg%3A%22org.webjars%22%20AND%20a%3A%22portal%22)

Then load it by script tag

```html
<script src="/portal/portal.min.js"></script>
<script>
portal.open("/test");
</script>
```

Or as an AMD module.

```javascript
require(["portal"], function(portal) {
    portal.open("/test");
});
```

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

## Prepare server

Officially the following portal server is available:

* [Portal for Java](https://github.com/flowersinthesand/portal-java)

The more server will be supported. Writing portal server is not such hard. One of the goals of this project from day 1 (jquery-stream) is easy to implement in server-side as simple as dealing with Ajax. As various transports and features are added, it gets harder than dealing with Ajax, but still quite easy comparing to other similar projects.

Check out [server.js](https://github.com/flowersinthesand/portal/blob/master/test/server.js). It is a good example and tutorial to write portal server and pass the test suite. If you just want to try out portal, follow instructions in [README](https://github.com/flowersinthesand/portal/blob/master/README.md#test-suite).  

Please inform me if you write portal server passing the test suite.

## Play

TODO