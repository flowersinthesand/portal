var original = $.extend(true, {}, portal);

function setup() {
	var reconnect = portal.defaults.reconnect;
	
	$.extend(portal.defaults, {
		transports: ["test"],
		sharing: false,
		reconnect: function() {
			var delay = reconnect.apply(this, arguments);
			return $.isNumeric(delay) ? delay * (this.data("transport") === "test" ? 0.01 : 1) : delay;
		}
	});
}

function teardown() {
	portal.finalize();
	
	var i, j;
	
	for (i in {defaults: 1, transports: 1}) {
		for (j in portal[i]) {
			delete portal[i][j];
		}
		
		$.extend(true, portal[i], original[i]);
	}
}

function param(url, name) {
	var match = new RegExp("[?&]" + name + "=([^&]*)").exec(url);
	return match ? decodeURIComponent(match[1]) : null;
}

function getAbsoluteURL(url) {
	return decodeURI($('<a href="' + url + '"/>')[0].href);
}

module("portal", {
	setup: setup,
	teardown: teardown
});

test("portal(url, option) should create a socket object", function() {
	ok(portal("url", {}));
});

test("portal(url) should return a socket object which is mapped to the given url, or if there is no mapped socket, should create one", function() {
	var socket = portal("url");
	
	ok(socket);
	strictEqual(socket, portal("url"));
});

test("portal(url) should be able to be returned by absolute url and relative url", function() {
	strictEqual(portal("url"), portal(getAbsoluteURL("url")));
});

test("portal() should return the first socket object", function() {
	var first = portal("first", {}), second = portal("second", {});
	
	strictEqual(first, portal());
	notStrictEqual(second, portal());
});

module("Socket", {
	setup: setup,
	teardown: teardown
});

test("option method should find the value of an option", function() {
	strictEqual(portal("url", {version: $.fn.jquery}).option("version"), $.fn.jquery);
});

test("data method should set and get a connection-scoped value", function() {
	strictEqual(portal("url").data("string", "value"), portal());
	strictEqual(portal("url").data("string"), "value");
});

test("connection scope should be reset when open method has been called", function() {
	ok(!portal("url").data("key", "value").open().data("key"));
});

test("on method should add a event handler", 5, function() {
	var type, 
		yes = function() {
			ok(true);
		};
	
	for (type in {connecting: 1, open: 1, message: 1, close: 1, waiting: 1}) {
		portal(type, {reconnect: false}).on(type, yes).fire(type);
	}
});

test("off method should remove a event handler", 4, function() {
	var type, 
		yes = function() {
			ok(true);
		},
		no = function() {
			ok(false);
		};
		
	for (type in {open: 1, message: 1, close: 1, waiting: 1}) {
		portal(type, {reconnect: false}).on(type, no).off(type, no).on(type, yes).fire(type);
	}
});

test("one method should add an one time event handler", 5, function() {
	var type, 
		yes = function() {
			ok(true);
		};
		
	for (type in {connecting: 1, open: 1, message: 1, close: 1, waiting: 1}) {
		portal(type).one(type, yes).fire(type).fire(type);
	}
});

test("handler attached by one method should be able to be detached by off method", 4, function() {
	var type, 
		yes = function() {
			ok(true);
		},
		no = function() {
			ok(false);
		};
		
	for (type in {open: 1, message: 1, close: 1, waiting: 1}) {
		portal(type).one(type, no).off(type, no).on(type, yes).fire(type);
	}
});

test("the context of all event handlers should be the corresponding socket object", 7, function() {
	var type,
		socket,
		fn = function() {
			strictEqual(this, socket);
		};
	
	for (type in {connecting: 1, open: 1, message: 1, close: 1, waiting: 1, custom1: 1, custom2: 1}) {
		socket = portal(type); 
		socket.on(type, fn).fire(type);
	}
});

$.each(["connecting", "open", "message", "close", "waiting"], function(i, name) {
	test(name + " method should add " + name + " event handler" + (name !== "message" ? " like the Common JS Promises/A" : ""), function() {
		var result = "",
			out = function(string) {
				return function() {
					result += string;
				};
			};
		
		portal("url")[name](out("A"))[name](out("B")).fire(name)[name](out("C"));
		
		strictEqual(result, name !== "message" ? "ABC" : "AB");
	});
});

asyncTest("open method should establish a connection", 1, function() {
	var latch;
	
	portal("url", {
		reconnect: false,
		server: function(request) {
			request.accept();
		}
	})
	.close(function() {
		if (!latch) {
			latch = true;
			this.open().open(function() {
				strictEqual("opened", this.state());
				start();
			});
		}
	})
	.close();
});

asyncTest("send method should defer sending message when the socket is not connected", function() {
	var result = "";
	
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				result += data;
				if (result === "ABC") {
					ok(true);
					start();
				}
			});
		}
	})
	.send("message", "A")
	.send("message", "B")
	.open(function() {
		this.send("message", "C");
	});
});

asyncTest("close method should close a connection", function() {
	portal("url")
	.close(function() {
		strictEqual("closed", this.state());
		start();
	})
	.close();
});

module("Transport", {
	setup: setup,
	teardown: teardown
});

test("transport function should receive the socket and the options", function() {
	var soc;
	
	portal.transports.subway = function(socket, options) {
		ok(socket);
		ok(options);
		soc = socket;
	};
	
	portal("url", {transports: ["subway"]});
	strictEqual(soc, portal());
});

test("transport function should be executed after the socket.open()", function() {
	var result = "";
	
	portal.transports.subway = function() {
		result += "A";
		return {
			open: function() {
				result += "B";
			},
			send: $.noop,
			close: $.noop
		};
	};
	
	portal("url", {transports: ["subway"]}).open();
	strictEqual(result, "ABAB");
});

test("transport's send method should be executed with data after the socket.send()", 1, function() {
	portal.transports.subway = function(socket) {
		return {
			open: function() {
				socket.fire("open");
			},
			send: function(data) {
				strictEqual($.parseJSON(data).type, "message");
			},
			close: $.noop
		};
	};
	
	portal("url", {transports: ["subway"]}).send("message");
});

test("transport's close method should be executed after the socket.close()", 1, function() {
	portal.transports.subway = function(socket) {
		return {
			open: function() {
				socket.fire("open");
			},
			send: $.noop,
			close: function() {
				ok(true);
			}
		};
	};
	
	portal("url", {transports: ["subway"]}).close();
});

test("transport function should be able to pass the responsibility onto the next transport function by returning void or false", function() {
	var result = "";
	
	portal.transports.bus = function() {
		result += "A";
	};
	portal.transports.subway = function() {
		result += "B";
		return {open: $.noop, send: $.noop, close: $.noop};
	};
	portal.transports.bicycle = function() {
		ok(false);
	};
	
	portal("url", {transports: ["bus", "subway", "bicycle"]});
	strictEqual(result, "AB");
});

module("Transport test", {
	setup: setup,
	teardown: teardown
});

asyncTest("server should be executed with request", function() {
	portal("url", {
		server: function(request) {
			ok(request);
			start();
		}
	});
});

asyncTest("request should be pended if there is no action on request", function() {
	portal("url", {
		server: function(request) {
			ok(request);
			setTimeout(function() {
				start();
			}, 10);
		}
	})
	.open(function() {
		ok(false);
	});
});

asyncTest("request's accept method should return connection object and fire open event", function() {
	portal("url", {
		server: function(request) {
			ok(request.accept());
		}
	})
	.open(function() {
		ok(true);
		start();
	});
});

asyncTest("request's reject method should fire close event whose the reason attribute is error", function() {
	portal("url", {
		reconnect: false,
		server: function(request) {
			ok(!request.reject());
		}
	})
	.open(function() {
		ok(false);
	})
	.close(function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

asyncTest("connection's send method should fire socket's message event", function() {
	portal("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				strictEqual(this, connection);
				connection.send("message", "data");
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "data");
		start();
	});
});

asyncTest("connection's close method should fire socket's close event whose the reason attribute is done", function() {
	portal("url", {
		reconnect: false,
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				strictEqual(this, connection);
				connection.close();
			});
		}
	})
	.close(function(reason) {
		strictEqual(reason, "done");
		start();
	});
});

asyncTest("connection's open event should be fired after socket's open event", function() {
	var result = "";
	
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				result += "B";
				strictEqual(result, "AB");
				start();
			});
		}
	})
	.open(function() {
		result += "A";
	});
});

asyncTest("connection's message event handler should receive a data sent by the socket", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				strictEqual(data, "Hello");
				start();
			});
		}
	})
	.send("message", "Hello");
});

asyncTest("connection's close event should be fired if opened socket's close event fires", function() {
	var result = "";
	
	portal("url", {
		server: function(request) {
			request.accept().on("close", function() {
				result += "B";
				strictEqual(result, "AB");
				start();
			});
		}
	})
	.open(function() {
		this.close();
	})
	.close(function() {
		result += "A";
	});
});

module("Event", {
	setup: setup,
	teardown: teardown
});

asyncTest("connecting event handler should be executed when a connection has tried", function() {
	portal("url").connecting(function() {
		ok(true);
		start();
	});
});

asyncTest("connecting event should be disabled after open event", function() {
	var result = "";
	
	portal("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		result += "A";
		this.connecting(function() {
			result += "B";
		});
		strictEqual(result, "A");
		start();
	});
});

asyncTest("open event handler should be executed when the connection has been established", function() {
	portal("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		ok(true);
		start();
	});
});

asyncTest("open event should be disabled after close event", function() {
	var result = "";
	
	portal("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		result += "A";
		this.close();
	})
	.close(function() {
		this.open(function() {
			result += "B";
		});
		strictEqual(result, "A");
		start();
	});
});

asyncTest("message event handler should be executed with data when a message has been received", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("message", "data");
			});
		}
	})
	.message(function(data) {
		ok(data);
		start();
	});
});

asyncTest("close event handler should be executed with a reason when the connection has been closed", function() {
	portal("url", {
		server: function(request) {
			request.reject();
		}
	})
	.close(function(reason) {
		ok(reason);
		start();
	});
});

asyncTest("close event's reason should be 'canceled' if the preparation is failed", function() {
	portal.defaults.prepare = function(connect, cancel) {
		cancel();
	};
	
	portal("url").close(function(reason) {
		strictEqual(reason, "canceled");
		start();
	});
});

asyncTest("close event's reason should be 'notransport' if there is no available transport", function() {
	portal.transports.what = $.noop;	
	portal("url", {transports: ["what"]})
	.close(function(reason) {
		strictEqual(reason, "notransport");
		start();
	});
});

asyncTest("close event's reason should be 'aborted' if the socket has been closed by the close method", function() {
	portal("url")
	.close(function(reason) {
		strictEqual(reason, "aborted");
		start();
	})
	.close();
});

asyncTest("close event's reason should be 'timeout' if the socket has been timed out", function() {
	portal("url", {reconnect: false, timeout: 10})
	.close(function(reason) {
		strictEqual(reason, "timeout");
		start();
	});
});

asyncTest("close event's reason should be 'error' if the socket has been closed due to not specific error", function() {
	portal("url", {
		reconnect: false,
		server: function(request) {
			request.reject();
		}
	})
	.close(function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

asyncTest("close event's reason should be 'done' if the socket has been closed normally", function() {
	portal("url", {
		reconnect: false,
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.close(function(reason) {
		strictEqual(reason, "done");
		start();
	});
});

asyncTest("waiting event handler should be executed with delay and attempts when a reconnection has scheduled and the socket has started waiting for connection", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.waiting(function(delay, attempts) {
		ok($.isNumeric(delay));
		ok($.isNumeric(attempts));
		start();
	});
});

module("State", {
	setup: setup,
	teardown: teardown
});

test("state should be 'preparing' before connecting event", function() {
	portal.defaults.prepare = $.noop;	
	strictEqual(portal("url").state(), "preparing");
});

asyncTest("state should be 'connecting' after connecting event", function() {
	portal("url")
	.connecting(function() {
		strictEqual(this.state(), "connecting");
		start();
	});
});

asyncTest("state should be 'opened' after open event", function() {
	portal("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		strictEqual(this.state(), "opened");
		start();
	});
});

asyncTest("state should be 'closed' after close event", function() {
	portal("url", {
		server: function(request) {
			request.reject();
		}
	})
	.close(function() {
		strictEqual(this.state(), "closed");
		start();
	});
});

asyncTest("state should be 'waiting' after waiting event", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.waiting(function() {
		strictEqual(this.state(), "waiting");
		start();
	});
});

module("Custom event", {
	setup: setup,
	teardown: teardown
});

test("on, off and one method should work with custom event", 2, function() {
	var yes = function() {
			ok(true);
		},
		no = function() {
			ok(false);
		};
	
	portal("url").on("custom", yes).on("custom", no).off("custom", no).one("custom", yes).fire("custom").fire("custom");
});

asyncTest("custom event handler should be executed with data when a custom message has been received", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("dm", {sender: "flowersits", message: "How are you?"});
			});
		}
	})
	.on("dm", function(data) {
		deepEqual(data, {sender: "flowersits", message: "How are you?"});
		start();
	});
});

asyncTest("send method should be able to send custom event message", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("dm", function(data) {
				deepEqual(data, {sender: "flowersits", message: "I'm fine thank you, and you?"});
				start();
			});
		}
	})
	.send("dm", {sender: "flowersits", message: "I'm fine thank you, and you?"});
});

module("Reconnection", {
	setup: function() {
		setup();
	},
	teardown: teardown
});

asyncTest("socket should reconnect by default", 4, function() {
	var reconnectCount = 4;
	
	portal("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		}
	})
	.waiting(function() {
		ok(true);
	})
	.open(function() {
		start();
	});
});

asyncTest("reconnect handler should receive last delay and the number of attempts and return next delay", 12, function() {
	var reconnectCount = 4, nextDelay = 20;
	
	portal("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		},
		reconnect: function(lastDelay, attempts) {
			lastDelay = lastDelay || 20;
			strictEqual(lastDelay, nextDelay + attempts - 1);
			strictEqual(attempts + reconnectCount, 4);
			
			return lastDelay + 1;
		}
	})
	.waiting(function() {
		ok(true);
	})
	.open(function() {
		start();
	});
});

asyncTest("reconnect handler which is false should stop reconnection", 1, function() {
	var reconnectCount = 4;
	
	portal("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		},
		reconnect: false
	})
	.connecting(function() {
		ok(true);
	})
	.waiting(function() {
		ok(false);
	})
	.close(function() {
		setTimeout(function() {
			start();
		}, 10);
	});
});

asyncTest("reconnect handler which returns false should stop reconnection", 1, function() {
	var reconnectCount = 4;
	
	portal("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		},
		reconnect: function() {
			return false;
		}
	})
	.connecting(function() {
		ok(true);
	})
	.waiting(function() {
		ok(false);
	})
	.close(function() {
		setTimeout(function() {
			start();
		}, 10);
	});
});

asyncTest("in case of manual reconnection connecting event should be fired", function() {
	portal("url", {
		reconnect: false,
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.one("close", function() {
		this.open().connecting(function() {
			ok(true);
			start();
		});
	});
});

asyncTest("the number of reconnection attempts should increment even when there is no available transport", function() {
	var oldAttempts;
	
	portal("url", {transports: []}).waiting(function(delay, attempts) {
		if (!oldAttempts) {
			oldAttempts = attempts;
		} else {
			ok(attempts > oldAttempts);
			start();
		}
	});
});

module("Heartbeat", {
	setup: function() {
		setup();
		portal.defaults.heartbeat = 500;
		portal.defaults._heartbeat = 250;
	},
	teardown: teardown
});

asyncTest("heartbeat event should be sent to the server repeatedly", function() {
	var i = 0, ts;
	
	portal("url", {
		server: function(request) {
			request.accept().on("heartbeat", function() {
				var now = $.now();
				
				if (ts) {
					ok(now - ts < portal.defaults.heartbeat);
				}
				ts = now;
				
				if (i++ > 2) {
					start();
				}
			});
		}
	});
});

asyncTest("connection should be closed when the server makes no response to a heartbeat", function() {
	portal.defaults.urlBuilder = function(url) {
		return url;
	};
	
	portal("url", {
		reconnect: false,
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		ok(true);
	})
	.close(function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

module("Reply", {
	setup: setup,
	teardown: teardown
});

asyncTest("callback for replying should be provided if the server requires reply", function() {
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("message", "An Ode to My Friend", $.noop);
			});
		}
	})
	.message(function(data, callback) {
		ok(callback);
		start();
	});
});

asyncTest("callback for replying should send a reply event", 2, function() {
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("message", "Heaven Shall Burn", function(reply) {
					strictEqual(reply, "Heaven Shall Burn");
					start();
				})
				.on("reply", function(data) {
					deepEqual(data, {id: 1, data: "Heaven Shall Burn"});
				});
			});
		}
	})
	.message(function(data, callback) {
		setTimeout(function() {
			callback(data);
		}, 10);
	});
});

asyncTest("done callback should work", 2, function() {
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data, callback) {
				callback(data);
			});
		}
	})
	.send("message", "Caliban", function(data) {
		strictEqual(data, "Caliban");
		start();
	})
	.on("reply", function(info) {
		deepEqual(info, {id: 1, data: "Caliban"});
	});
});

asyncTest("done callback should be able to event name", 2, function() {
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data, callback) {
				callback(data);
			});
		}
	})
	.send("message", "Vassline", "done")
	.on("done", function(data) {
		strictEqual(data, "Vassline");
		start();
	})
	.on("reply", function(info) {
		deepEqual(info, {id: 1, data: "Vassline"});
	});
});

asyncTest("fail callback should work", 2, function() {
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data, callback) {
				throw data;
			});
		}
	})
	.send("message", "Gangnam Style", function() {
		ok(false);
	}, function(exception) {
		strictEqual(exception, "Gangnam Style");
		start();
	})
	.on("reply", function(info) {
		deepEqual(info, {id: 1, data: "Gangnam Style", exception: true});
	});
});

asyncTest("fail callback should be able to event name", 2, function() {
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data, callback) {
				throw data;
			});
		}
	})
	.send("message", "Gangnam Style", "done", "fail")
	.on("done", function() {
		ok(false);
	})
	.on("fail", function(exception) {
		strictEqual(exception, "Gangnam Style");
		start();
	})
	.on("reply", function(info) {
		deepEqual(info, {id: 1, data: "Gangnam Style", exception: true});
	});
});

module("Protocol", {
	setup: setup,
	teardown: teardown
});

asyncTest("prepare handler should receive connect and cancel function and options, and be executed before the socket tries to connect", function() {
	var executed;
	
	portal.defaults.prepare = function(connect, cancel, options) {
		executed = true;
		ok($.isFunction(connect));
		ok($.isFunction(cancel));
		ok(options);
		connect();
	};
	
	portal("url").connecting(function() {
		ok(executed);
		start();
	});
});

test("idGenerator should return a unique id within the server", function() {
	portal.defaults.idGenerator = function() {
		return "flowersinthesand";
	};
	
	strictEqual(portal("url").option("id"), "flowersinthesand");
});

test("url used for connection should be exposed by data('url')", function() {
	ok(portal("url").data("url"));
});

test("urlBuilder should receive the absoulte form of original url and the parameters object and return a url to be used to establish a connection", function() {
	portal.defaults.urlBuilder = function(url, params) {
		strictEqual(url, getAbsoluteURL("url"));
		ok(params._ && delete params._);
		deepEqual(params, {id: this.option("id"), heartbeat: this.option("heartbeat"), transport: "test", lastEventId: this.option("lastEventId")});
		
		return "modified";
	};
	
	strictEqual(portal("url").data("url"), "modified");
});

test("params option should be merged with default params object", function() {
	portal.defaults.urlBuilder = function(url, params) {
		strictEqual(params.id, "fixed");
		strictEqual(params.noop, $.noop);
		return url;
	};
	
	portal("url", {
		params: {
			id: "fixed",
			noop: $.noop
		}
	});
});

asyncTest("lastEventId option should be the id of the last event which is sent by the server", function() {
	portal("url", {
		lastEventId: 25,
		server: function(request) {
			request.accept().on("open", function() {
				var i;
				for (i = 0; i < 10; i++) {
					this.send("message", i + 1);
				}
			});
		}
	})
	.message(function(eventId) {
		strictEqual(this.option("lastEventId"), eventId);
		if (eventId === 10) {
			start();
		}
	})
	.connecting(function() {
		strictEqual(this.option("lastEventId"), 25);
	});
});

asyncTest("outbound handler should receive a event object and return a final data to be sent to the server", function() {
	portal.defaults.outbound = function(event) {
		deepEqual(event, {id: 1, socket: this.option("id"), reply: false, type: "message", data: "data"});
		return $.stringifyJSON(event);
	};
	
	portal("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				strictEqual(data, "data");
				start();
			});
		}
	})
	.send("message", "data");
});

asyncTest("inbound handler should receive a raw data from the server and return a event object", function() {
	portal.defaults.inbound = function(data) {
		deepEqual($.parseJSON(data), {id: 1, reply: false, type: "message", data: "data"});
		return $.parseJSON(data);
	};
	
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("message", "data");
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "data");
		start();
	});
});

asyncTest("inbound handler should be able to return an array of event object", function() {
	portal.defaults.inbound = function(data) {
		var event = $.parseJSON(data); 
		ok($.isArray(event.data));
		
		return event.data;
	};
	
	portal("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("composite", [
					{type: "music", data: ["Hollow Jan", "49 Morphines", "Vassline"]},
					{type: "start"}
				]);
			});
		}
	})
	.on("music", function(data) {
		deepEqual(data, ["Hollow Jan", "49 Morphines", "Vassline"]);
	})
	.on("start", function() {
		start();
	});
});

asyncTest("event object should contain a event type and optional id, reply, socket, and data property", function() {
	var inbound, outbound;
	
	portal.defaults.inbound = function(event) {
		event = $.parseJSON(event);
		if (inbound) {
			inbound(event);
			inbound = null;
		}
		
		return event;
	};
	portal.defaults.outbound = function(event) {
		if (outbound) {
			outbound(event);
			outbound = null;
		}
		
		return $.stringifyJSON(event);
	};
	
	portal("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		var self = this, id = self.option("id");
		
		outbound = function(event) {
			deepEqual(event, {id: 1, socket: id, reply: false, type: "message", data: {key: "value"}});
		};
		this.send("message", {key: "value"});
		
		outbound = function(event) {
			deepEqual(event, {id: 2, socket: id, reply: false, type: "chat", data: "data"});
		};
		this.send("chat", "data");
		
		outbound = function(event) {
			deepEqual(event, {id: 3, socket: id, reply: true, type: "news", data: "data"});
		};
		this.send("news", "data", $.noop);
		
		inbound = function(event) {
			deepEqual(event, {type: "message", data: {key: "value"}});
		};
		this._fire($.stringifyJSON({type: "message", data: {key: "value"}}));
		
		inbound = function(event) {
			deepEqual(event, {type: "chat", data: "data"});
		};
		this._fire($.stringifyJSON({type: "chat", data: "data"}));
		
		start();
	});
});

test("transport used for connection should be exposed by data('transport')", function() {
	ok(portal("url").data("transport"));
});

if (window.Blob && window.ArrayBuffer && (window.MozBlobBuilder || window.WebKitBlobBuilder)) {
	asyncTest("binary data should be sent transparently", function() {
		var BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder, i = 0;
		
		function isBinary(data) {
			var string = Object.prototype.toString.call(data);
			return string === "[object Blob]" || string === "[object ArrayBuffer]";
		}
		
		portal.defaults.inbound = portal.defaults.outbound = function() {
			ok(false);
		};
		
		portal("url", {
			server: function(request) {
				request.accept().on("message", function(data) {
					ok(isBinary(data));
					this.send("message", data);
				});
			}
		})
		.message(function(data) {
			i++;
			ok(isBinary(data));
			
			if (i === 2) {
				start();
			}
		})
		.send("message", new BlobBuilder().getBlob())
		.send("message", new window.ArrayBuffer());
	});
}

test("xdrURL handler should receive data('url') and return a new url containing session id", function() {
	portal.defaults.xdrURL = function(url) {
		strictEqual(url, this.data("url"));
		
		return "modified";
	};
	portal.transports.test = function(socket, options) {
		socket.data("url", options.xdrURL.call(socket, socket.data("url")));
	};
	
	strictEqual(portal("url").data("url"), "modified");
});

test("streamParser handler should receive a chunk and return an array of data", function() {
	portal.defaults.streamParser = function(chunk) {
		return chunk.split("@@");
	};
	
	portal("url");
	deepEqual(portal.defaults.streamParser.call(portal(), "A"), ["A"]);
	deepEqual(portal.defaults.streamParser.call(portal(), "A@@B@@C"), ["A", "B", "C"]);
});

module("Protocol default", {
	setup: setup,
	teardown: teardown
});

test("effective url should contain id, transport and heartbeat as query string parameters", function() {
	var url = portal("url").data("url");
	
	strictEqual(param(url, "id"), portal().option("id"));
	strictEqual(param(url, "transport"), portal().data("transport"));
	strictEqual(param(url, "heartbeat"), String(portal().option("heartbeat")));
	strictEqual(param(url, "lastEventId"), portal().option("lastEventId"));
});

test("a final data to be sent to the server should be a JSON string representing a event object", function() {
	portal.transports.test = function(socket) {
		return {
			open: function() {
				socket.fire("open");
			},
			send: function(data) {
				try {
					deepEqual($.parseJSON(data), {id: 1, socket: socket.option("id"), reply: false, type: "message", data: "data"});
				} catch (e) {
					ok(false);
				}
			},
			close: $.noop
		};
	};
	
	portal("url").send("message", "data");
});

test("a raw data sent by the server should be a JSON string representing a event object", function() {
	portal.transports.test = function(socket) {
		return {
			open: function() {
				socket._fire($.stringifyJSON({type: "open", data: "data"}));
			},
			send: $.noop,
			close: $.noop
		};
	};
	
	portal("url").open(function(data) {
		strictEqual(data, "data");
	});
});

test("xdrURL handler should be able to handle JSESSIONID and PHPSESSID in cookies", function() {
	$.each({
		JSESSIONID: {
			"url": "url;jsessionid=JSESSIONID", 
			"url?x=y": "url;jsessionid=JSESSIONID?x=y", 
			"url;jsessionid=xx": "url;jsessionid=JSESSIONID", 
			"url;jsessionid=xx?x=y": "url;jsessionid=JSESSIONID?x=y"
		},
		PHPSESSID: {
			"url": "url?PHPSESSID=PHPSESSID", 
			"url?x=y": "url?PHPSESSID=PHPSESSID&x=y", 
			"url?PHPSESSID=xx": "url?PHPSESSID=PHPSESSID", 
			"url?PHPSESSID=xx&x=y": "url?PHPSESSID=PHPSESSID&x=y"
		}
	}, function(name, data) {
		document.cookie = name + "=" + name;
		$.each(data, function(url, expected) {
			strictEqual(portal.defaults.xdrURL.call(portal("url"), url), expected);
		});
		document.cookie = name + "=" + ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});
});

test("stream response should accord with the event stream format", function() {
	deepEqual(portal.defaults.streamParser.call(portal("url"), "data: A\r\n\r\ndata: A\r\ndata: B\rdata: C\n\r\ndata: \r\n"), ["A", "A\nB\nC", ""]);
});

function testTransport(transport, fn) {
	var url = "/portal-test/echo";
	
	if ((transport === "ws" && !window.WebSocket && !window.MozWebSocket) || 
		(transport === "sse" && !window.EventSource) || 
		(transport === "streamxhr" && (!window.XMLHttpRequest || ($.browser.msie && +$.browser.version < 10))) || 
		(transport === "streamxdr" && !window.XDomainRequest) ||
		(transport === "streamiframe" && !window.ActiveXObject) || 
		(transport === "longpollajax" && !$.support.ajax) ||
		(transport === "longpollxdr" && !window.XDomainRequest)) {
		return;
	}
	
	if (QUnit.urlParams.crossdomain) {
		if (/streamiframe/.test(transport) || (/streamxhr|longpollajax/.test(transport) && !$.support.cors)) {
			return;
		} else if (/sse/.test(transport)) {
			try {
				if (!("withCredentials" in new EventSource("about:blank"))) {
					return;
				}
			} catch (e) {
				return;
			}
		}
		
		url = remoteURL + url;
	}
	
	if (fn) {
		fn(url);
	}
	 
	asyncTest("open method should work properly", function() {
		portal(url).open(function() {
			ok(true);
			start();
		});
	});
	
	asyncTest("send method should work properly", function() {
		portal(url).message(function(data) {
			strictEqual(data, "data");
			start();
		})
		.send("message", "data");
	});
	
	asyncTest("send method should work properly with multi-byte character data", function() {
		portal(url).message(function(data) {
			strictEqual(data, "안녕");
			start();
		})
		.send("message", "안녕");
	});
	
	asyncTest("send method should work properly with big data", function() {
		var i, text = "A";
		
		for (i = 0; i < Math.pow(2, transport === "ws" ? 12 : 15); i++) {
			text += "A";
		}
		
		portal(url).message(function(data) {
			strictEqual(data, text);
			start();
		})
		.send("message", text);
	});
	
	asyncTest("close method should work properly", function() {
		portal(url).close(function(reason) {
			strictEqual(reason, "aborted");
			start();
		})
		.close();
	});
	
	asyncTest("close event whose the reason attribute is done should be fired when the server disconnects a connection cleanly", function() {
		portal(url + "?close=1000", {reconnect: false}).close(function(reason) {
			strictEqual(reason, "done");
			start();
		});
	});
}

if (!isLocal) {
	module("Transport WebSocket", {
		setup: function() {
			setup();
			portal.defaults.transports = ["ws"];
		},
		teardown: teardown
	});
	
	testTransport("ws", function(url) {
		test("url should be converted to accord with WebSocket specification", function() {
			ok(/^(?:ws|wss):\/\/.+/.test(portal(url).data("url")));
		});
		
		asyncTest("WebSocket event should be able to be accessed by data('event')", 3, function() {
			portal(url).open(function() {
				strictEqual(this.data("event").type, "open");
				this.send("message", "data");
			})
			.message(function() {
				strictEqual(this.data("event").type, "message");
				this.close();
			})
			.close(function() {
				strictEqual(this.data("event").type, "close");
				start();
			});
		});
		
	});
	
	module("Transport HTTP Streaming", {
		setup: function() {
			setup();
			portal.defaults.transports = ["stream"];
		},
		teardown: teardown
	});
	
	test("stream transport should execute real transports", function() {
		var result = "";
		
		portal.transports.streamxhr = function() {
			result += "A";
		};
		portal.transports.streamxdr = function() {
			result += "B";
		};
		portal.transports.streamiframe = function() {
			result += "C";
		};
		
		portal("echo");
		
		strictEqual(result, "ABC");
	});
	
	$.each({
		streamxhr: $.noop,
		streamxdr: function(url) {
			test("xdrURL which is false should stop streamxdr transport", function() {
				portal.defaults.xdrURL = false;
				portal(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
			test("xdrURL which returns false should stop streamxdr transport", function() {
				portal.defaults.xdrURL = function() {
					return false;
				};
				portal(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
		},
		streamiframe: function(url) {
			asyncTest("initIframe should be called with iframe element before the open event", 2, function() {
				portal.defaults.initIframe = function(iframe) {
					ok(iframe);
					ok(iframe.contentDocument || iframe.contentWindow.document);
				};
				portal(url).open(function() {
					start();
				});
			});
		}
	}, function(transport, fn) {
		var transportName = ({streamxdr: "XDomainRequest", streamiframe: "ActiveXObject('htmlfile')", streamxhr: "XMLHttpRequest"})[transport];
		
		module("Transport HTTP Streaming - " + transportName, {
			setup: function() {
				setup();
				portal.defaults.transports = [transport];
				portal.defaults.xdrURL = transport !== "streamxdr" ? false : function(url) {
					return url;
				};
			},
			teardown: teardown
		});
		
		testTransport(transport, function(url) {
			fn(url);
			asyncTest("non-whitespace characters printed in the first chunk should be regarded as data", function() {
				portal(url + "?firstMessage=true").message(function(data) {
					strictEqual(data, "hello");
					start();
				});
			});
		});
	});
	
	module("Transport Server-Sent Events", {
		setup: function() {
			setup();
			portal.defaults.transports = ["sse"];
		},
		teardown: teardown
	});
	
	testTransport("sse", function(url) {
		asyncTest("Server-Sent Events event should be able to be accessed by data('event')", 3, function() {
			portal(url + "?close=1000", {reconnect: false}).open(function() {
				strictEqual(this.data("event").type, "open");
				this.send("message", "data");
			})
			.message(function() {
				strictEqual(this.data("event").type, "message");
			})
			.close(function() {
				strictEqual(this.data("event").type, "error");
				start();
			});
		});
	});
	
	module("Transport Long Polling", {
		setup: function() {
			setup();
			portal.defaults.transports = ["longpoll"];
		},
		teardown: teardown
	});
	
	test("longpoll transport should execute real transports", function() {
		var result = "";
		
		portal.transports.longpollajax = function() {
			result += "A";
		};
		portal.transports.longpollxdr = function() {
			result += "B";
		};
		portal.transports.longpolljsonp = function() {
			result += "C";
		};
		
		portal("echo");
		
		strictEqual(result, "ABC");
	});
	
	$.each({
		longpollajax: $.noop,
		longpollxdr: function(url) {
			test("xdrURL which is false should stop longpollxdr transport", function() {
				portal.defaults.xdrURL = false;
				portal(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
			test("xdrURL which returns false should stop longpollxdr transport", function() {
				portal.defaults.xdrURL = function() {
					return false;
				};
				portal(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
		}, 
		longpolljsonp: function(url) {
			test("window should have a function whose name is equals to data('url')'s callback parameter", function() {
				ok($.isFunction(window[param(portal(url).data("url"), "callback")]));
			});
		}
	}, function(transport, fn) {
		var transportName = ({longpollajax: "AJAX", longpollxdr: "XDomainRequest", longpolljsonp: "JSONP"})[transport];
		
		module("Transport HTTP Long Polling - " + transportName, {
			setup: function() {
				setup();
				portal.defaults.transports = [transport];
				portal.defaults.xdrURL = transport !== "longpollxdr" ? false : function(url) {
					return url;
				};
			},
			teardown: teardown
		});
		
		testTransport(transport, function(url) {
			fn(url);
			asyncTest("data('url') should be modified whenever trying to connect to the server", 6, function() {
				var oldCount, oldLastEventId;
				
				portal(url).send("message", 0).message(function(i) {
					var url = this.data("url"), 
						count = param(url, "count"), 
						lastEventId = param(url, "lastEventId");
					
					if (oldCount !=null && oldLastEventId != null) {
						ok(oldCount < count);
						ok(oldLastEventId < lastEventId);
					}
					oldCount = count;
					oldLastEventId = lastEventId;
					
					if (i > 2) {
						start();
					} else {
						this.send("message", ++i);
					}
				});
			});
			asyncTest("open event should be fired regardless of the server's status if longpollTest is false", function() {
				portal(url + "wrong", {longpollTest: false}).open(function() {
					ok(true);
					start();
				});
			});
		});
	});
}