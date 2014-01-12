---
layout: news
title: "Portal 0.8.0 released"
categories: [news]
---

# Portal for Java 0.8.0 released

As already announced, Portal for Java has been completely redesigned and rewritten as refrerence implementation and became more simple and concise than before. Accordingly, new item is added in donate page.

### Highlight
* **Built on top of wes.** [wes](http://flowersinthesand.github.io/wes/) is a project designed to enable web application like Portal for Java to run on as many platform and framework as possible and derived from Portal for Java 0.7.
* **Simple and Concise.** All you need to know is `Server` and `Socket` and you don't need to write stateful bean anymore. It's replaced with stateless function which can be more simplified with Java 8.
* **Tag.** Tag is a newly introduced selector. Do tag sockets and find them by tag.
* **Options.** It is available to customize protocol in server side.

Check out [Getting Started](http://flowersinthesand.github.io/portal-java/).

### Migration
Because of complete redesign, it becomes inevitable to face backward compatibility issue. This is not complete migration guide but would give you some help. Check out [Getting Started](http://flowersinthesand.github.io/portal-java/) and [JavaDoc](http://flowersinthesand.github.io/portal-java/0.8.0/api/).

* Module
    * `portal-core`
        * Renamed to `portal` under the new group id, `io.github.flowersinthesand`.
    * `portal-atmosphere`, `portal-play`, `portal-vertx`
        * Moved into wes.
    * `portal-spring`, `portal-guice`
        * Object factory is not needed. See dependency injection for how to use.
    * `portal-spel`
        * No replacement.
* Interface
    * `Options`
        * I/O options are configured in wes.
        * For protocol options, see `DefaultServer`.
    * `App`
        * Replaced with `Server`.
    * `Room`, `Hall`
        * Replaced with tag. See `Server.byTag` and `Socket.tags`.
* Annotation
    * `@Bean`, `@Wire`, `@Init`, `@Destory`
        * No replacement.
    * `@On`
        * See `Socket.on` method.
    * `@Order`
        * Actions will be fired in insertion order.
    * `@Data`
        * Allowed data types are limited to Java types corresponding to JSON types. However, you can still use declarative conversion. See data type conversion.
    * `@Reply`
        * See `Socket.Reply`.