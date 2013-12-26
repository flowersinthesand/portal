---
layout: documentation
title: Writing server
---

# Writing server
Writing portal server is not such hard. One of the goals of this project from day 1 (jquery-stream) is easy to implement in server-side as simple as dealing with Ajax. As various transports and features are added, it gets harder than dealing with Ajax, but still quite easy comparing to other similar projects.

To be a portal server

**Required**

* Pass the [test suite](https://github.com/flowersinthesand/portal/blob/master/test/webapp/index.html) in same origin and cross origin environments in all the supported browser.

**Preferable**

* Clustering
    * Application should be able to be clustered to scale.
    * Messaging Oriented Middleware (MOM) is enough.
      * Encode a given operation into message and broadcast it to nodes.
      * Each node decodes message and performs that operation if possible.  
* Transport negotiation
    * Server should be able to return the best transports in handshake.
    * Not sure about how it can be achieved.
* Tag as socket selector
    * Socket should be able to be tagged.
    * Socket should be able to find by tag.

That being said, you don't need to write this portal server. Implement only what your application needs. See [compatibility]({{ site.baseurl }}/documentation/1.1.0/compatibility/) of portal.js.

To develop portal.js, I have written a test server, server.js, in JavaScript for Node.js to run the test suite. Check out [server.js](https://github.com/flowersinthesand/portal/blob/master/test/server.js). One example is worth a thousand words.

Please inform [me](http://twitter.com/flowersits) if you have written a portal server passing the test suite.