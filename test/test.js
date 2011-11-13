var defaults = $.extend(true, {}, $.socket.defaults);

function teardown() {
	$(window).trigger("unload.socket");
	$.extend(true, $.socket.defaults, defaults);
}

module("jQuery.socket", {
	setup: function() {
		$.socket.defaults.reconnect = false;
	},
	teardown: teardown
});

test("jQuery.socket(url, option) should create a socket object", function() {
	ok($.socket("url", {}));
});

test("jQuery.socket(url) should return a socket object which is mapped to the given url, or if there is no mapped socket, should create one", function() {
	var socket = $.socket("url");
	
	ok(socket);
	strictEqual(socket, $.socket("url"));
	
	notStrictEqual(Object.prototype.toString, $.socket("toString"));
});

test("jQuery.socket() should return the first socket object", function() {
	var first, second;
	
	Object.prototype.property = 1;
	strictEqual(null, $.socket());
	delete Object.prototype.property;
	
	first = $.socket("first", {});
	
	strictEqual(first, $.socket());
	
	second = $.socket("second", {});
	
	notStrictEqual(second, $.socket());
	strictEqual(first, $.socket());
});

module("Socket object", {
	setup: function() {
		$.socket.defaults.reconnect = false;
	},
	teardown: teardown
});

test("options property should include the given options", function() {
	$.socket("url", {version: $.fn.jquery});
	strictEqual($.socket("url", {version: $.fn.jquery}).options.version, $.fn.jquery);
});

test("on method should add a event handler", 6, function() {
	var type, 
		yes = function() {
			ok(true);
		};
	
	for (type in {connecting: 1, open: 1, message: 1, fail: 1, done: 1, close: 1}) {
		$.socket(type).on(type, yes).fire(type);
	}
});

test("off method should remove a event handler", 5, function() {
	var type, 
		yes = function() {
			ok(true);
		},
		no = function() {
			ok(false);
		};
		
	for (type in {open: 1, message: 1, fail: 1, done: 1, close: 1}) {
		$.socket(type).on(type, no).off(type, no).on(type, yes).fire(type);
	}
});

test("one method should add an one time event handler", 6, function() {
	var type, 
		yes = function() {
			ok(true);
		};
		
	for (type in {connecting: 1, open: 1, message: 1, fail: 1, done: 1, close: 1}) {
		$.socket(type).one(type, yes).fire(type).fire(type);
	}
});

$.each(["connecting", "open", "message", "fail", "done", "close"], function(i, name) {
	test(name + " method should add " + name + " event handler" + (name !== "message" ? " - flags: once, memory" : ""), function() {
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

asyncTest("open method should establish a connection", function() {
	var first = true;
	
	$.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.close(function() {
		if (first) {
			first = false;
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

test("find method should find a sub socket", function() {
	ok($.socket("url").find("chat"));
});

module("Transport test", {
	setup: function() {
		$.socket.defaults.reconnect = false;
	},
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
			setTimeout(start, 100);
		}
	})
	.open(function() {
		ok(false);
	})
	.done(function() {
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
	})
	.done(function() {
		ok(false);
	});
});

asyncTest("request's reject method should fire fail event", function() {
	$.socket("url", {
		server: function(request) {
			ok(!request.reject());
		}
	})
	.open(function() {
		ok(false);
	})
	.fail(function() {
		ok(true);
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

asyncTest("connection's close method should fire socket's done event", function() {
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				strictEqual(this, connection);
				connection.close();
			});
		}
	})
	.done(function() {
		ok(true);
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

asyncTest("connection's close event should be fired if opened socket's fail event fires", function() {
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
	.fail(function() {
		result += "A";
	})
	.close();
});

asyncTest("connection's close event should be fired if opened socket's done event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			})
			.on("close", function() {
				result += "B";
				strictEqual(result, "AB");
				start();
			});
		}
	})
	.done(function() {
		result += "A";
	});
});

asyncTest("connection's close event handler should be able to receive close code and reason", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("close", function(code, reason) {
				ok(code, 1000);
				ok(reason, "normal");
				start();
			});
		}
	})
	.close(1000, "normal");
});

module("Socket event", {
	setup: function() {
		$.socket.defaults.reconnect = false;
	},
	teardown: teardown
});

asyncTest("connecting event handler should be executed with delay and attempts when a connection has tried", function() {
	var socket = $.socket("url");
	socket.connecting(function(delay, attempts) {
		ok($.isNumeric(delay));
		ok($.isNumeric(attempts));
		strictEqual(this, socket);
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
	var socket = $.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		strictEqual(this, socket);
		start();
	});
});

asyncTest("open event should be disabled after fail event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		result += "A";
	})
	.fail(function() {
		this.open(function() {
			result += "B";
		});
		strictEqual(result, "A");
		start();
	})
	.close();
});

asyncTest("open event should be disabled after done event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.open(function() {
		result += "A";
	})
	.close(function() {
		this.open(function() {
			result += "B";
		});
		strictEqual(result, "A");
		start();
	})
	.close();
});

asyncTest("message event handler should be executed with data when a message has been received", function() {
	var socket = $.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("data");
			});
		}
	})
	.message(function(data) {
		strictEqual(this, socket);
		ok(data);
		start();
	});
});

asyncTest("message event's data should be parsed into a string if dataType is 'text'", function() {
	$.socket("url", {
		dataType: "text",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("name=Donghwan");
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "name=Donghwan");
		start();
	});
});


asyncTest("message event's data should be parsed into a json object if dataType is 'json'", function() {
	$.socket("url", {
		dataType: "json",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("{\"name\":\"Donghwan\"}");
			});
		}
	})
	.message(function(data) {
		deepEqual(data, {name: "Donghwan"});
		start();
	});
});

asyncTest("message event's data should be parsed into an xml document if dataType is 'xml'", function() {
	$.socket("url", {
		dataType: "xml",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("<name>Donghwan</name>");
			});
		}
	})
	.message(function(data) {
		strictEqual($(data).find("name").text(), "Donghwan");
		start();
	});
});

asyncTest("fail event handler should be executed with a reason when the connection has been closed due to an error", function() {
	var socket = $.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.fail(function(reason) {
		strictEqual(this, socket);
		ok(reason);
		start();
	});
});

asyncTest("fail event's reason should be 'close' if the socket's close method has been called with no arguments", function() {
	$.socket("url")
	.fail(function(reason) {
		strictEqual(reason, "close");
		start();
	})
	.close();
});

asyncTest("fail event's reason should be 'parseerror' if parsing a message's data fails", function() {
	$.socket("url", {
		dataType: "json",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("<name>Donghwan</name>");
			});
		}
	})
	.fail(function(reason) {
		strictEqual(reason, "parseerror");
		start();
	});
});

asyncTest("fail event's reason should be 'timeout' if the socket has been timed out", function() {
	$.socket("url", {timeout: 100})
	.fail(function(reason) {
		strictEqual(reason, "timeout");
		start();
	});
});

asyncTest("fail event's reason should be 'error' if the socket has been closed due to not specific error", function() {
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.fail(function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

asyncTest("done event handler should be executed when the connection has been closed normally", function() {
	var socket = $.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.done(function() {
		strictEqual(this, socket);
		start();
	});
});

asyncTest("close event should be fired after fail event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.fail(function() {
		result += "A";
	})
	.close(function() {
		result += "B";
		strictEqual(result, "AB");
		start();
	});
});

asyncTest("close event should be fired after done event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.done(function() {
		result += "A";
	})
	.close(function() {
		result += "B";
		strictEqual(result, "AB");
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

asyncTest("state should be 'closed' after fail event", function() {
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.fail(function() {
		strictEqual(this.state(), "closed");
		start();
	});
});

asyncTest("state should be 'closed' after done event", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.done(function() {
		strictEqual(this.state(), "closed");
		start();
	});
});

module("Custom event", {
	setup: function() {
		$.socket.defaults.reconnect = false;
	},
	teardown: teardown
});

test("on, off and one method should work with custom event", 3, function() {
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
		dataType: "json",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("{\"event\":\"dm\",\"data\":{\"sender\":\"flowersits\",\"message\":\"How are you?\"}}");
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
			request.accept().on("message", function(data) {
				// TODO data should be string
				deepEqual(data, {event: "dm", data: {receiver: "flowersits", message: "I'm fine thank you, and you?"}});
				start();
			});
		}
	})
	.send("dm", {receiver: "flowersits", message: "I'm fine thank you, and you?"});
});

module("Sub socket", {
	setup: function() {
		$.socket.defaults.reconnect = false;
	},
	teardown: teardown
});

asyncTest("open event should be triggered following the source socket's open event", function() {
	$.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.find("dm")
	.open(function() {
		ok(true);
		start();
	});
});

asyncTest("message event should be triggered following the source socket's corresponding message event", function() {
	$.socket("url", {
		dataType: "json",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("{\"event\":\"dm\",\"data\":{\"sender\":\"flowersits\",\"message\":\"How are you?\"}}");
			});
		}
	})
	.find("dm")
	.message(function(data) {
		deepEqual(data, {sender: "flowersits", message: "How are you?"});
		start();
	});
});

asyncTest("fail event should be triggered following the source socket's fail event", function() {
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.find("dm")
	.fail(function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

asyncTest("done event should be triggered following the source socket's done event", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.find("dm")
	.done(function() {
		ok(true);
		start();
	});
});

asyncTest("send method should send custom message to the source socket", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				// TODO data should be string
				deepEqual(data, {event: "dm", data: {receiver: "flowersits", message: "I'm fine thank you, and you?"}});
				start();
			});
		}
	})
	.find("dm")
	.send({receiver: "flowersits", message: "I'm fine thank you, and you?"});
});

asyncTest("close method should close only the sub socket, not the source socket", function() {
	var started;
	
	$.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.fail(function() {
		if (!started) {
			ok(false);
		}
	})
	.find("dm")
	.fail(function(reason) {
		strictEqual(reason, "close");
		start();
		started = true;
	})
	.close();
});

asyncTest("find method should work with sub socket", function() {
	$.socket("url", {
		dataType: "json",
		server: function(request) {
			request.accept().on("open", function() {
				this.send("{\"event\":\"chat\",\"data\":{\"event\":\"music\",\"data\":{\"message\":\"what's your favorite band?\"}}}");
			})
			.on("message", function(data) {
				// TODO data should be string
				deepEqual(data, {event:"chat", data: {event: "music", data: {message: "hollow jan"}}});
				start();
			});
		}
	})
	.find("chat")
	.find("music")
	.message(function(data) {
		deepEqual(data, {message: "what's your favorite band?"});
		this.send({message: "hollow jan"});
	});
});

module("Reconnection", {
	setup: function() {
		$.socket.defaults.reconnectDelay = 10;
	},
	teardown: teardown
});

asyncTest("socket should reconnect by default", 5, function() {
	var reconnectCount = 4;
	
	$.socket("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		}
	})
	.connecting(function() {
		ok(true);
	})
	.open(function() {
		start();
	});
});

asyncTest("sub socket should reconnect according to the source socket", 4, function() {
	var count = 4;
	
	$.socket("url", {
		server: function(request) {
			if (count--) {
				request.accept().on("open", function() {
					this.close();
				});
			}
		}
	})
	.find("dm")
	.open(function() {
		ok(true);
		if (!count) {
			start();
		}
	});
});

asyncTest("reconnect handler should receive last delay and the number of attempts and return next delay", 13, function() {
	var reconnectCount = 4, nextDelay = 20;
	
	$.socket("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		},
		reconnectDelay: 20,
		reconnect: function(delay, attempts) {
			strictEqual(delay, nextDelay + attempts - 1);
			strictEqual(attempts + reconnectCount, 4);
			
			return delay + 1;
		}
	})
	.connecting(function() {
		ok(true);
	})
	.open(function() {
		start();
	});
});

asyncTest("reconnect handler which is false should prevent the socket from reconnecting", 1, function() {
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
	.close(function() {
		setTimeout(start, 100);
	});
});

asyncTest("reconnect handler which returns false should prevent the socket from reconnecting", 1, function() {
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
	.close(function() {
		setTimeout(start, 100);
	});
});