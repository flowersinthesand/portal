var original = $.extend(true, {}, $.socket);

function setup() {
	var reconnect = $.socket.defaults.reconnect;
	
	$.extend($.socket.defaults, {
		transports: ["test"],
		reconnect: function() {
			var delay = reconnect.apply(this, arguments);
			return $.isNumeric(delay) ? delay * (this.session("transport") === "test" ? 0.01 : 1) : delay;
		}
	});
}

function teardown() {
	$(window).trigger("unload.socket");
	
	var i, j;
	
	for (i in {defaults: 1, transports: 1}) {
		for (j in $.socket[i]) {
			delete $.socket[i][j];
		}
		
		$.extend(true, $.socket[i], original[i]);
	}
}

function param(url, name) {
	var match = new RegExp("[?&]" + name + "=([^&]*)").exec(url);
	return match ? decodeURIComponent(match[1]) : null;
}

function getAbsoluteURL(url) {
	return decodeURI($('<a href="' + url + '"/>')[0].href);
}

module("jQuery.socket", {
	setup: setup,
	teardown: teardown
});

test("jQuery.socket(url, option) should create a socket object", function() {
	ok($.socket("url", {}));
});

test("jQuery.socket(url) should return a socket object which is mapped to the given url, or if there is no mapped socket, should create one", function() {
	var socket = $.socket("url");
	
	ok(socket);
	strictEqual(socket, $.socket("url"));
});

test("jQuery.socket(url) should be able to be returned by absolute url and relative url", function() {
	strictEqual($.socket("url"), $.socket(getAbsoluteURL("url")));
});

test("jQuery.socket() should return the first socket object", function() {
	var first = $.socket("first", {}), second = $.socket("second", {});
	
	strictEqual(first, $.socket());
	notStrictEqual(second, $.socket());
});

module("Socket object", {
	setup: setup,
	teardown: teardown
});

test("option method should find the value of an option", function() {
	strictEqual($.socket("url", {version: $.fn.jquery}).option("version"), $.fn.jquery);
});

test("session method should set and get a session-scoped value", function() {
	strictEqual($.socket("url").session("string", "value"), $.socket());
	strictEqual($.socket("url").session("string"), "value");
});

test("session scope should be reset when open method has been called", function() {
	ok(!$.socket("url").session("key", "value").open().session("key"));
});

test("on method should add a event handler", 5, function() {
	var type, 
		yes = function() {
			ok(true);
		};
	
	for (type in {connecting: 1, open: 1, message: 1, close: 1, waiting: 1}) {
		$.socket(type).on(type, yes).fire(type);
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
		$.socket(type).on(type, no).off(type, no).on(type, yes).fire(type);
	}
});

test("one method should add an one time event handler", 5, function() {
	var type, 
		yes = function() {
			ok(true);
		};
		
	for (type in {connecting: 1, open: 1, message: 1, close: 1, waiting: 1}) {
		$.socket(type).one(type, yes).fire(type).fire(type);
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
		$.socket(type).one(type, no).off(type, no).on(type, yes).fire(type);
	}
});

test("the context of all event handlers should be the corresponding socket object", 7, function() {
	var type,
		socket,
		fn = function() {
			strictEqual(this, socket);
		};
	
	for (type in {connecting: 1, open: 1, message: 1, close: 1, waiting: 1, custom1: 1, custom2: 1}) {
		socket = $.socket(type); 
		socket.on(type, fn).fire(type);
	}
});

$.each(["connecting", "open", "message", "close", "waiting"], function(i, name) {
	test(name + " method should add " + name + " event handler" + (name !== "message" ? " like a Deferred" : ""), function() {
		var result = "",
			out = function(string) {
				return function() {
					result += string;
				};
			};
		
		$.socket("url")[name](out("A"))[name](out("B")).fire(name)[name](out("C"));
		
		strictEqual(result, name !== "message" ? "ABC" : "AB");
	});
});

asyncTest("open method should establish a connection", 1, function() {
	var latch;
	
	$.socket("url", {
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
	
	$.socket("url", {
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
	.send("A")
	.send("B")
	.open(function() {
		$.socket().send("C");
	});
});

asyncTest("close method should close a connection", function() {
	$.socket("url")
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
	
	$.socket.transports.subway = function(socket, options) {
		ok(socket);
		ok(options);
		soc = socket;
	};
	
	$.socket("url", {transports: ["subway"]});
	strictEqual(soc, $.socket());
});

test("transport function should be executed after the socket.open()", function() {
	var result = "";
	
	$.socket.transports.subway = function() {
		result += "A";
		return {
			open: function() {
				result += "B";
			},
			send: $.noop,
			close: $.noop
		};
	};
	
	$.socket("url", {transports: ["subway"]}).open();
	strictEqual(result, "ABAB");
});

test("transport's send method should be executed with data after the socket.send()", 1, function() {
	$.socket.transports.subway = function(socket) {
		return {
			open: function() {
				socket.fire("open");
			},
			send: function(data) {
				strictEqual($.parseJSON(data).data, "data");
			},
			close: $.noop
		};
	};
	
	$.socket("url", {transports: ["subway"]}).send("data");
});

test("transport's close method should be executed after the socket.close()", 1, function() {
	$.socket.transports.subway = function(socket) {
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
	
	$.socket("url", {transports: ["subway"]}).close();
});

test("transport function should be able to pass the responsibility onto the next transport function by returning void or false", function() {
	var result = "";
	
	$.socket.transports.bus = function() {
		result += "A";
	};
	$.socket.transports.subway = function() {
		result += "B";
		return {open: $.noop, send: $.noop, close: $.noop};
	};
	$.socket.transports.bicycle = function() {
		ok(false);
	};
	
	$.socket("url", {transports: ["bus", "subway", "bicycle"]});
	strictEqual(result, "AB");
});

module("Transport test", {
	setup: setup,
	teardown: teardown
});

asyncTest("server should be executed with request", function() {
	$.socket("url", {
		server: function(request) {
			ok(request);
			start();
		}
	});
});

asyncTest("request should be pended if there is no action on request", function() {
	$.socket("url", {
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
	$.socket("url", {
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
	$.socket("url", {
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
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				strictEqual(this, connection);
				connection.send("data");
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "data");
		start();
	});
});

asyncTest("connection's close method should fire socket's close event whose the reason attribute is done", function() {
	$.socket("url", {
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
	
	$.socket("url", {
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
	$.socket("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				strictEqual(data, "Hello");
				start();
			});
		}
	})
	.send("Hello");
});

asyncTest("connection's close event should be fired if opened socket's close event fires", function() {
	var result = "";
	
	$.socket("url", {
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

module("Socket event", {
	setup: setup,
	teardown: teardown
});

asyncTest("connecting event handler should be executed when a connection has tried", function() {
	$.socket("url").connecting(function() {
		ok(true);
		start();
	});
});

asyncTest("connecting event should be disabled after open event", function() {
	var result = "";
	
	$.socket("url", {
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
	$.socket("url", {
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
	
	$.socket("url", {
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
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("data");
			});
		}
	})
	.message(function(data) {
		ok(data);
		start();
	});
});

asyncTest("close event handler should be executed with a reason when the connection has been closed", function() {
	$.socket("url", {
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
	$.socket.defaults.prepare = function(connect, cancel) {
		cancel();
	};
	
	$.socket("url").close(function(reason) {
		strictEqual(reason, "canceled");
		start();
	});
});

asyncTest("close event's reason should be 'notransport' if there is no available transport", function() {
	$.socket("url", {transports: ["what"]})
	.close(function(reason) {
		strictEqual(reason, "notransport");
		start();
	});
});

asyncTest("close event's reason should be 'aborted' if the socket has been closed by the close method", function() {
	$.socket("url")
	.close(function(reason) {
		strictEqual(reason, "aborted");
		start();
	})
	.close();
});

asyncTest("close event's reason should be 'timeout' if the socket has been timed out", function() {
	$.socket("url", {reconnect: false, timeout: 10})
	.close(function(reason) {
		strictEqual(reason, "timeout");
		start();
	});
});

asyncTest("close event's reason should be 'error' if the socket has been closed due to not specific error", function() {
	$.socket("url", {
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
	$.socket("url", {
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
	$.socket("url", {
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

module("Socket state", {
	setup: setup,
	teardown: teardown
});

asyncTest("state should be 'preparing' before connecting event", function() {
	$.socket.defaults.prepare = function() {
		strictEqual(this.state(), "preparing");
		start();
	};
	
	$.socket("url");
});

asyncTest("state should be 'connecting' after connecting event", function() {
	$.socket("url")
	.connecting(function() {
		strictEqual(this.state(), "connecting");
		start();
	});
});

asyncTest("state should be 'opened' after open event", function() {
	$.socket("url", {
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
	$.socket("url", {
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
	$.socket("url", {
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
	
	$.socket("url").on("custom", yes).on("custom", no).off("custom", no).one("custom", yes).fire("custom").fire("custom");
});

asyncTest("custom event handler should be executed with data when a custom message has been received", function() {
	$.socket("url", {
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
	$.socket("url", {
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
	
	$.socket("url", {
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
	
	$.socket("url", {
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
	
	$.socket("url", {
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
	
	$.socket("url", {
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
	$.socket("url", {
		reconnect: false,
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.one("close", function() {
		$.socket().open().connecting(function() {
			ok(true);
			start();
		});
	});
});

asyncTest("the number of reconnection attempts should increment even when there is no available transport", function() {
	var oldAttempts;
	
	$.socket("url", {transports: []}).waiting(function(delay, attempts) {
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
		$.socket.defaults.heartbeat = 500;
		$.socket.defaults._heartbeat = 250;
	},
	teardown: teardown
});

asyncTest("heartbeat event should be sent to the server repeatedly", function() {
	var i = 0, ts;
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("heartbeat", function() {
				var now = $.now();
				
				if (ts) {
					ok(now - ts < $.socket.defaults.heartbeat);
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
	$.socket.defaults.url = function(url) {
		return url;
	};
	
	$.socket("url", {
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
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("An Ode to My Friend", $.noop);
			});
		}
	})
	.message(function(data, callback) {
		ok(callback);
		start();
	});
});

asyncTest("callback for replying should send a reply event", 2, function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("Heaven Shall Burn", function(reply) {
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

asyncTest("socket should require the server to reply if a reply callback is provided", 2, function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("message", function() {
				return "Caliban";
			});
		}
	})
	.send("data", function(reply) {
		strictEqual(reply, "Caliban");
		start();
	})
	.on("reply", function(data) {
		deepEqual(data, {id: 1, data: "Caliban"});
	});
});

module("Protocol", {
	setup: setup,
	teardown: teardown
});

asyncTest("prepare handler should receive connect and cancel function and options, and be executed before the socket tries to connect", function() {
	var executed;
	
	$.socket.defaults.prepare = function(connect, cancel, options) {
		executed = true;
		ok($.isFunction(connect));
		ok($.isFunction(cancel));
		ok(options);
		connect();
	};
	
	$.socket("url").connecting(function() {
		ok(executed);
		start();
	});
});

test("id handler should return a unique id within the server", function() {
	$.socket.defaults.id = function() {
		return "flowersinthesand";
	};
	
	strictEqual($.socket("url").option("id"), "flowersinthesand");
});

test("url used for connection should be exposed by session('url')", function() {
	ok($.socket("url").session("url"));
});

test("url handler should receive the absoulte form of original url and the parameters object and return a url to be used to establish a connection", function() {
	$.socket.defaults.url = function(url, params) {
		strictEqual(url, getAbsoluteURL("url"));
		ok(params._ && delete params._);
		deepEqual(params, {id: this.option("id"), heartbeat: this.option("heartbeat"), transport: "test", lastEventId: this.option("lastEventId")});
		
		return "modified";
	};
	
	strictEqual($.socket("url").session("url"), "modified");
});

test("params option should be merged with default params object", function() {
	$.socket.defaults.url = function(url, params) {
		strictEqual(params.id, "fixed");
		strictEqual(params.noop, $.noop);
		return url;
	};
	
	$.socket("url", {
		params: {
			id: "fixed",
			noop: $.noop
		}
	});
});

asyncTest("lastEventId option should be the id of the last event which is sent by the server", function() {
	$.socket("url", {
		lastEventId: 25,
		server: function(request) {
			request.accept().on("open", function() {
				var i;
				for (i = 0; i < 10; i++) {
					this.send(i + 1);
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
	$.socket.defaults.outbound = function(event) {
		deepEqual(event, {id: 1, socket: this.option("id"), reply: false, type: "message", data: "data"});
		return $.stringifyJSON(event);
	};
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				strictEqual(data, "data");
				start();
			});
		}
	})
	.send("data");
});

asyncTest("inbound handler should receive a raw data from the server and return a event object", function() {
	$.socket.defaults.inbound = function(data) {
		deepEqual($.parseJSON(data), {id: 1, reply: false, type: "message", data: "data"});
		return $.parseJSON(data);
	};
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("data");
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "data");
		start();
	});
});

asyncTest("inbound handler should be able to return an array of event object", function() {
	$.socket.defaults.inbound = function(data) {
		var event = $.parseJSON(data); 
		ok($.isArray(event.data));
		
		return event.data;
	};
	
	$.socket("url", {
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
	
	$.socket.defaults.inbound = function(event) {
		event = $.parseJSON(event);
		if (inbound) {
			inbound(event);
			inbound = null;
		}
		
		return event;
	};
	$.socket.defaults.outbound = function(event) {
		if (outbound) {
			outbound(event);
			outbound = null;
		}
		
		return $.stringifyJSON(event);
	};
	
	$.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		var self = this, id = self.option("id");
		
		outbound = function(event) {
			deepEqual(event, {id: 1, socket: id, reply: false, type: "message", data: {key: "value"}});
		};
		this.send({key: "value"});
		
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
		this._notify($.stringifyJSON({type: "message", data: {key: "value"}}));
		
		inbound = function(event) {
			deepEqual(event, {type: "chat", data: "data"});
		};
		this._notify($.stringifyJSON({type: "chat", data: "data"}));
		
		start();
	});
});

test("transport used for connection should be exposed by session('transport')", function() {
	ok($.socket("url").session("transport"));
});

if (window.Blob && window.ArrayBuffer && (window.MozBlobBuilder || window.WebKitBlobBuilder)) {
	asyncTest("binary data should be sent transparently", function() {
		var BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder, i = 0;
		
		function isBinary(data) {
			var string = Object.prototype.toString.call(data);
			return string === "[object Blob]" || string === "[object ArrayBuffer]";
		}
		
		$.socket.defaults.inbound = $.socket.defaults.outbound = function() {
			ok(false);
		};
		
		$.socket("url", {
			server: function(request) {
				request.accept().on("message", function(data) {
					ok(isBinary(data));
					this.send(data);
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
		.send(new BlobBuilder().getBlob())
		.send(new window.ArrayBuffer());
	});
}

test("xdrURL handler should receive session('url') and return a new url containing session id", function() {
	$.socket.defaults.xdrURL = function(url) {
		strictEqual(url, this.session("url"));
		
		return "modified";
	};
	$.socket.transports.test = function(socket, options) {
		socket.session("url", options.xdrURL.call(socket, socket.session("url")));
	};
	
	strictEqual($.socket("url").session("url"), "modified");
});

test("streamParser handler should receive a chunk and return an array of data", function() {
	$.socket.defaults.streamParser = function(chunk) {
		return chunk.split("@@");
	};
	
	$.socket("url");
	deepEqual($.socket.defaults.streamParser.call($.socket(), "A"), ["A"]);
	deepEqual($.socket.defaults.streamParser.call($.socket(), "A@@B@@C"), ["A", "B", "C"]);
});

module("Protocol default", {
	setup: setup,
	teardown: teardown
});

test("effective url should contain id, transport and heartbeat as query string parameters", function() {
	var url = $.socket("url").session("url");
	
	strictEqual(param(url, "id"), $.socket().option("id"));
	strictEqual(param(url, "transport"), $.socket().session("transport"));
	strictEqual(param(url, "heartbeat"), String($.socket().option("heartbeat")));
	strictEqual(param(url, "lastEventId"), $.socket().option("lastEventId"));
});

test("a final data to be sent to the server should be a JSON string representing a event object", function() {
	$.socket.transports.test = function(socket) {
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
	
	$.socket("url").send("data");
});

test("a raw data sent by the server should be a JSON string representing a event object", function() {
	$.socket.transports.test = function(socket) {
		return {
			open: function() {
				socket._notify($.stringifyJSON({type: "open", data: "data"}));
			},
			send: $.noop,
			close: $.noop
		};
	};
	
	$.socket("url").open(function(data) {
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
			strictEqual($.socket.defaults.xdrURL.call($.socket("url"), url), expected);
		});
		document.cookie = name + "=" + ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});
});

test("stream response should accord with the event stream format", function() {
	deepEqual($.socket.defaults.streamParser.call($.socket("url"), "data: A\r\n\r\ndata: A\r\ndata: B\rdata: C\n\r\ndata: \r\n"), ["A", "A\nB\nC", ""]);
});

function testTransport(transport, fn) {
	var url = "/jquery-socket-test/echo";
	
	if ((transport === "ws" && !window.WebSocket && !window.MozWebSocket) || 
		(transport === "sse" && !window.EventSource) || 
		(transport === "streamxhr" && (!window.XMLHttpRequest || window.ActiveXObject || window.XDomainRequest || ($.browser.android && $.browser.webkit))) || 
		(transport === "streamiframe" && !window.ActiveXObject) || 
		(transport === "streamxdr" && !window.XDomainRequest) ||
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
		$.socket(url).open(function() {
			ok(true);
			start();
		});
	});
	
	asyncTest("send method should work properly", function() {
		$.socket(url).message(function(data) {
			strictEqual(data, "data");
			start();
		})
		.send("data");
	});
	
	asyncTest("send method should work properly with multi-byte character data", function() {
		$.socket(url).message(function(data) {
			strictEqual(data, "안녕");
			start();
		})
		.send("안녕");
	});
	
	asyncTest("send method should work properly with big data", function() {
		var i, text = "A";
		
		for (i = 0; i < Math.pow(2, transport === "ws" ? 12 : 15); i++) {
			text += "A";
		}
		
		$.socket(url).message(function(data) {
			strictEqual(data, text);
			start();
		})
		.send(text);
	});
	
	asyncTest("close method should work properly", function() {
		$.socket(url).close(function(reason) {
			strictEqual(reason, "aborted");
			start();
		})
		.close();
	});
	
	asyncTest("close event whose the reason attribute is done should be fired when the server disconnects a connection cleanly", function() {
		$.socket(url + "?close=true", {reconnect: false}).close(function(reason) {
			strictEqual(reason, "done");
			start();
		});
	});
	
	if (/^longpoll/.test(transport)) {
		asyncTest("session('url') should be modified whenever trying to connect to the server", 6, function() {
			var oldCount, oldLastEventId;
			
			$.socket(url).send(0).message(function(i) {
				var url = this.session("url"), 
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
					this.send(++i);
				}
			});
		});
	}
}

if (!isLocal) {
	module("Transport WebSocket", {
		setup: function() {
			setup();
			$.socket.defaults.transports = "ws";
		},
		teardown: teardown
	});
	
	testTransport("ws", function(url) {
		test("url should be converted to accord with WebSocket specification", function() {
			ok(/^(?:ws|wss):\/\/.+/.test($.socket(url).session("url")));
		});
		
		asyncTest("WebSocket event should be able to be accessed by session('event')", function() {
			$.socket(url).open(function() {
				strictEqual(this.session("event").type, "open");
				this.send("data");
			})
			.message(function() {
				strictEqual(this.session("event").type, "message");
				this.close();
			})
			.close(function() {
				strictEqual(this.session("event").type, "close");
				start();
			});
		});
		
	});
	
	module("Transport HTTP Streaming", {
		setup: function() {
			setup();
			$.socket.defaults.transports = "stream";
		},
		teardown: teardown
	});
	
	test("stream transport should execute real transports", function() {
		var result = "";
		
		$.socket.transports.streamxdr = function() {
			result += "A";
		};
		$.socket.transports.streamiframe = function() {
			result += "B";
		};
		$.socket.transports.streamxhr = function() {
			result += "C";
		};
		
		$.socket("echo");
		
		strictEqual(result, "ABC");
	});
	
	$.each({
		streamxdr: function(url) {
			test("xdrURL which is false should stop streamxdr transport", function() {
				$.socket.defaults.xdrURL = false;
				$.socket(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
			test("xdrURL which returns false should stop streamxdr transport", function() {
				$.socket.defaults.xdrURL = function() {
					return false;
				};
				$.socket(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
		},
		streamiframe: $.noop,
		streamxhr: $.noop
	}, function(transport, fn) {
		var transportName = ({streamxdr: "XDomainRequest", streamiframe: "ActiveXObject('htmlfile')", streamxhr: "XMLHttpRequest"})[transport];
		
		module("Transport HTTP Streaming - " + transportName, {
			setup: function() {
				setup();
				$.socket.defaults.transports = transport;
				$.socket.defaults.xdrURL = transport !== "streamxdr" ? false : function(url) {
					return url;
				};
			},
			teardown: teardown
		});
		
		testTransport(transport, fn);
	});
	
	module("Transport Server-Sent Events", {
		setup: function() {
			setup();
			$.socket.defaults.transports = "sse";
		},
		teardown: teardown
	});
	
	testTransport("sse", function(url) {
		asyncTest("Server-Sent Events event should be able to be accessed by session('event')", function() {
			$.socket(url + "?close=true", {reconnect: false}).open(function() {
				strictEqual(this.session("event").type, "open");
				this.send("data");
			})
			.message(function() {
				strictEqual(this.session("event").type, "message");
			})
			.close(function() {
				strictEqual(this.session("event").type, "error");
				start();
			});
		});
	});
	
	module("Transport Long Polling", {
		setup: function() {
			setup();
			$.socket.defaults.transports = "longpoll";
		},
		teardown: teardown
	});
	
	test("longpoll transport should execute real transports", function() {
		var result = "";
		
		$.socket.transports.longpollajax = function() {
			result += "A";
		};
		$.socket.transports.longpollxdr = function() {
			result += "B";
		};
		$.socket.transports.longpolljsonp = function() {
			result += "C";
		};
		
		$.socket("echo");
		
		strictEqual(result, "ABC");
	});
	
	$.each({
		longpollajax: $.noop,
		longpollxdr: function(url) {
			test("xdrURL which is false should stop longpollxdr transport", function() {
				$.socket.defaults.xdrURL = false;
				$.socket(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
			test("xdrURL which returns false should stop longpollxdr transport", function() {
				$.socket.defaults.xdrURL = function() {
					return false;
				};
				$.socket(url).close(function(reason) {
					strictEqual(reason, "notransport");
					start();
				});
			});
		}, 
		longpolljsonp: function(url) {
			test("window should have a function whose name is equals to session('url')'s callback parameter", function() {
				ok($.isFunction(window[param($.socket(url).session("url"), "callback")]));
			});
		}
	}, function(transport, fn) {
		var transportName = ({longpollajax: "AJAX", longpollxdr: "XDomainRequest", longpolljsonp: "JSONP"})[transport];
		
		module("Transport HTTP Long Polling - " + transportName, {
			setup: function() {
				setup();
				$.socket.defaults.transports = transport;
				$.socket.defaults.xdrURL = transport !== "longpollxdr" ? false : function(url) {
					return url;
				};
			},
			teardown: teardown
		});
		
		testTransport(transport, fn);
	});
}