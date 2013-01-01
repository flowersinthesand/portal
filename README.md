# Portal
The **Portal** is a server agnostic JavaScript library that not just provides a socket for browser-based applications that need two-way communication with servers, but also aims to utilize a full duplex connection for modern web application development.

All you need to do to use the **Portal** is to prepare a [event-driven](http://daverecycles.com/post/3104767110/explain-event-driven-web-servers-to-your-grandma) server and to implement some server-side code to run transports which application will use. Whether cross-domain connections and browsers are supported or not is depending on transport. 

There is the **Portal for Java** project which is a [reference implementation of the server counterpart](https://github.com/flowersinthesand/portal-java) written in Java. Look at it to implement a portal server in other languages.

The **Portal** and **Portal for Java** project is developed and maintained by [Donghwan Kim](http://twitter.com/flowersits). If you are interested, please subscribe to the [discussion group](https://groups.google.com/d/forum/portal_project).

## References
* [API](https://github.com/flowersinthesand/portal/wiki/API)
* [Features](https://github.com/flowersinthesand/portal/wiki/Features)
* [Socket Life Cycle and Events](https://github.com/flowersinthesand/portal/wiki/Socket-Life-Cycle-and-Events)
* [Supported Transports and Browsers](https://github.com/flowersinthesand/portal/wiki/Supported-Transports-and-Browsers)
* [Browser Quirks](https://github.com/flowersinthesand/portal/wiki/Browser-Quirks)
* [Required Server Side Processing](https://github.com/flowersinthesand/portal/wiki/Server-Side-Processing)
* [Advanced Server Side Processing](https://github.com/flowersinthesand/portal/wiki/Advanced-Server-Side-Processing)

## Snippets
The server part is written in the **Portal for Java**.

### Echoing a message
A simple echo handler which echoes back any message.

#### Browser
```js
portal.open("/echo").send("message", "hello").message(function(data) {
    console.log(data);
});
```

#### Server
```java
@Handler("/echo")
public class EchoHandler {

    @On.message
    public void message(Socket socket, @Data String message) {
        socket.send("message", message);
    }

}
```

### Broadcasting a message using room
A simple chat handler which broadcasts a received message to the room.

#### Browser
```js
portal.open("/chat").on({
    open: function() {
        this.send("message", "Hi, there");
    },
    message: function(message) {
        console.log(message);
    }
});
```

#### Server
```java
@Handler("/chat")
public class ChatHandler {

    @Name("chat")
    private Room room;

    @On.open
    public void open(Socket socket) {
        room.add(socket);
    }
    
    @On.message
    public void message(@Data String message) {
        room.send(message);
    }

}
```

### Notification delivery
Any event which occurs in anywhere in the server side can be sent to the client.

#### Browser
```js
portal.open("/notifications").on(notifiers);
```

#### Server
```java
@Component
public class NotificationEventListener implements ApplicationListener<NotificationEvent> {

    public void onApplicationEvent(NotificationEvent e) {
        Notification n = e.notification();
        App.find().room(n.target()).send(n.type(), n.data());
    }

}
```

### Notifying change of model
Changes in domain layer can be applied to presentation layer in real time as well.

#### Browser
```js
portal.find("/entity").on("account#" + id, function(model) {
    console.log(model);
});
```

#### Server
```java
@Entity
public class Account extend Model {

    @PostUpdate
    public void updated() {
        App.find("/entity").room("account#" + id).send("updated", this);
    }

}
```

### Type conversion of event data
Event data can be object and be converted to the specific type based on JSON format.

#### Browser
```js
portal.find().send("account.save", {username: "flowersinthesand", email: "flowersinthesand@gmail.com"});
```

#### Server
```java
@Handler("/entity")
public class AccountHandler {

    @On("account.save")
    public void save(@Data Account account) {
        account.save();
    }

}
```

### Retrieving data
Using reply callback, the client can retrieve data from the server asynchronously like AJAX.

#### Browser
```js
portal.find("/post").send("find", 5, function(post) {
    console.log(post);
});
```

#### Server
```java
@Handler("/post")
public class PostHandler {

    private EntityManager em;
    
    @Prepare
    public void prepare() {
        em = Persistence.createEntityManagerFactory("mse").createEntityManager();
    }
    
    @On("find")
    public void find(@Data Integer id, @Reply Fn.Callback1<Post> reply) {
        reply.call(em.find(Post.class, id));
    }

}
```

### Sharing a data store
Room can be used as a shared data store.

#### Browser
```js
portal.open("/data").send("set", {key: "key", value: "value"}, function() {
    portal.find("/data").send("get", "key", function(value) {
        console.log(value);
    });
});

```

#### Server
```java
@Handler("/data")
public class DataHandler {

    @Name("data")
    private Room room;
    
    @On("set")
    public void set(@Data Entity e, @Reply Fn.Callback reply) {
        room.set(e.key(), e.data());
        if (reply != null) {
            reply.call();
        }
    }

    @On("get")
    public void get(@Data String key, @Reply Fn.Callback1<Object> reply) {
        reply.call(room.get(key));
    }
    
}
```