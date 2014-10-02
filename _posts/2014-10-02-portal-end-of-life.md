---
layout: news
title: "Portal End-of-Life"
categories: [news]
---

# Portal End-of-Life

The development of Portal is actually over on Jan but I'd like to announce it officially as Vibe is released.

[Portal](http://flowersinthesand.github.io/portal) 1.1.1, [Portal for Java](http://flowersinthesand.github.io/portal-java) 0.9.0 and [wes](http://flowersinthesand.github.io/wes) 0.2.1 are successfully absorbed into [Vibe](http://vibe-project.github.io/) as known as Atmosphere 3 through refactoring, bug fixes and enhancements, a framework to write low-latency, event-driven, real-time web application based on its own protocol built over HTTP and WebSocket. Accordingly, none of these projects are no longer maintained and I would like to strongly recommend to use Vibe instead of Portal.

Unlike Atmosphere, migrating an application from Portal to Vibe is very easy because there is only slight changes at the API level. If you are familiar to the merger of Apache Struts and OpenSymphony WebWork for Apache Struts 2, you may easily understand what is happening to Atmosphere and Portal.

See [Vibe's features and roadmap](http://vibe-project.github.io/blog/vibe-3.0.0-alpha1-released) and [How to migrate from Portal to Vibe](http://vibe-project.github.io/blog/migration-from-portal/).

However if you are hesitating migration, see the following advantages of Vibe over Portal that will help you make decision.

* For writing real-time web application itself.
    * While Portal has focused on ease to implement server first as it has started as a jQuery plugin for HTTP streaming and rejected any idea which could make protocol complex no matter how useful it would be, Vibe focuses on ease to write real-time web application itself more than anything else so is willing to accept any ideas if it's worth.
* Based on own protocol.
    * Portal has under the implicit protocol provided only two implementations: JavaScript client and Java server, but Vibe will provide various implementations including the previous ones based on its own explicit protocol so that it would be certainly easy to use Vibe in other language.
* Easy to write and verify implementation.
    * Portal's protocol is clearly separated to the very protocol part that have to be implemented and the extension part that can be optionally implemented, and on top of that, Vibe provides reference implementation and test suite to help write and verify your implementation.
* Merged with Atmosphere.
    *  Vibe is also a result from a collaboration of Atmosphere and Portal. Useful features and detailed experiences of Atmosphere like performance tuning, binary handling, workaround for I/O platform's quirks will be available in Vibe.
* Leaded by Donghwan Kim and Jeanfrancois Arcand.
    * Jeanfrancois Arcand, an author of Grizzly, Asynchronous HTTP Client and Atmosphere, also leads Vibe. His rich experience in Java enterprise application and open source project will doubtless help Vibe out.
* On the superior community.
    * As Atmosphere 3, Vibe will inherit the good parts from Atmosphere. One of them is the superior community. Atmosphere has been developed and maintained by warm participation of the community. Now Vibe will be.
* Commercial support.
    * Now you can safely mitigate the risk to use a work from my one man show. [Asnyc-IO](async-io.org), the company behind the Atmosphere, provides commercial support for Vibe as well.