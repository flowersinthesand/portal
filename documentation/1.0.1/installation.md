---
layout: documentation
title: Installation
---

# Installation

## Download

### Git repository

Download portal.js and copy it to the static folder. The portal server may do that for you.

* [portal v1.0.1 compressed](https://raw.github.com/flowersinthesand/portal/1.0.1/portal.min.js)
* [portal v1.0.1 uncompressed](https://raw.github.com/flowersinthesand/portal/1.0.1/portal.js)

### CDN

Compressed and uncompressed official version of portal.js are available on the [cdnjs](http://cdnjs.com/libraries/portal). Note that there may be delays between a release and its availability.

```html
<script src="//cdnjs.cloudflare.com/ajax/libs/portal/1.0.1/portal.js"></script>
```
```html
<script src="//cdnjs.cloudflare.com/ajax/libs/portal/1.0.1/portal.min.js"></script>
```

### WebJars

If you want manage the portal.js as a dependency in Java Virtual Machine based application, go to [WebJars](http://www.webjars.org/) and search 'portal'. For the details, see their [documentation](http://www.webjars.org/documentation). Compressed and uncompressed official version of portal.js are available and note that there may be delays between a release and its availability. 

## Loading

### Standalone
Use script tag as a typical way to load script.

```html
<script src="/portal/portal.min.js"></script>
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