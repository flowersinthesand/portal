var original = $.extend(true, {}, $.socket);

function setup() {
	$.socket.defaults.transport = "test";
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
	var match = new RegExp("[?&]" + name + "=([^&]+)").exec(url);
	return match ? decodeURIComponent(match[1]) : null;
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
	setup: setup,
	teardown: teardown
});

test("url method should return the given url", function() {
	strictEqual($.socket("url").url(), "url");
});

test("options property should include the given options", function() {
	$.socket("url", {version: $.fn.jquery});
	strictEqual($.socket("url", {version: $.fn.jquery}).options.version, $.fn.jquery);
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
	$.socket("url", {reconnect: false})
	.open(function() {
		ok(true);
		start();
	})
	.one("close", function() {
		this.options.server = function(request) {
			request.accept();
		};
		this.open();
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

test("data method should set and get a value", function() {
	strictEqual($.socket("url").data("string", "value"), $.socket());
	strictEqual($.socket("url").data({number: 1, fn: $.noop}), $.socket());
	
	strictEqual($.socket("url").data("boolean"), null);
	strictEqual($.socket("url").data("string"), "value");
	strictEqual($.socket("url").data("number"), 1);
	strictEqual($.socket("url").data().fn, $.noop);
});

test("data method should be reset when open method has been called", function() {
	notStrictEqual($.socket("url").data(), $.socket("url").open().data());
});

module("Transport", {
	setup: setup,
	teardown: teardown
});

test("transport function should receive the socket", function() {
	var soc;
	
	$.socket.transports.subway = function(socket) {
		ok(socket);
		soc = socket;
	};
	
	$.socket("url", {transport: "subway"});
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
	
	$.socket("url", {transport: "subway"}).open();
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
	
	$.socket("url", {transport: "subway"}).send("data");
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
	
	$.socket("url", {transport: "subway"}).close();
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
	
	$.socket("url", {transport: ["bus", "subway", "bicycle"]});
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
			setTimeout(start, 10);
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
		server: function(request) {
			ok(!request.reject());
		}
	})
	.open(function() {
		ok(false);
	})
	.one("close", function(reason) {
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
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				strictEqual(this, connection);
				connection.close();
			});
		}
	})
	.one("close", function(reason) {
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

asyncTest("close event's reason should be 'notransport' if there is no available transport", function() {
	$.socket("url", {transport: "what"})
	.close(function(reason) {
		strictEqual(reason, "notransport");
		start();
	});
});

asyncTest("close event's reason should be 'close' if the socket's close method has been called", function() {
	$.socket("url")
	.close(function(reason) {
		strictEqual(reason, "close");
		start();
	})
	.close();
});

asyncTest("close event's reason should be 'timeout' if the socket has been timed out", function() {
	$.socket("url", {timeout: 10})
	.close(function(reason) {
		strictEqual(reason, "timeout");
		start();
	});
});

asyncTest("close event's reason should be 'error' if the socket has been closed due to not specific error", function() {
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.one("close", function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

asyncTest("close event's reason should be 'done' if the socket has been closed normally", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.one("close", function(reason) {
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

module("Sub socket", {
	setup: setup,
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
		server: function(request) {
			request.accept().on("open", function() {
				this.send("dm", {sender: "flowersits", message: "How are you?"});
			});
		}
	})
	.find("dm")
	.message(function(data) {
		deepEqual(data, {sender: "flowersits", message: "How are you?"});
		start();
	});
});

asyncTest("close event should be triggered following the source socket's close event", function() {
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.find("dm")
	.close(function(reason) {
		strictEqual(reason, "error");
		start();
	});
});

asyncTest("send method should send custom message to the source socket", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("dm", function(data) {
				deepEqual(data, {receiver: "flowersits", message: "I'm fine thank you, and you?"});
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
	.close(function() {
		if (!started) {
			ok(false);
		}
	})
	.find("dm")
	.close(function(reason) {
		strictEqual(reason, "close");
		start();
		started = true;
	})
	.close();
});

asyncTest("event handlers should be registered once even though the source socket has been reconnected", function() {
	var count = 0, result = "";

	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.send("dm", String.fromCharCode("A".charCodeAt(0) + count));
				if (count++ < 3) {
					this.close();
				} else {
					strictEqual(result, "ABC");
					start();
				}
			});
		}
	})
	.find("dm")
	.message(function(data) {
		result += data;
	});
});

module("Reconnection", {
	setup: function() {
		setup();
		$.socket.defaults._reconnect = 10;
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

asyncTest("reconnect handler should receive last delay and the number of attempts and return next delay", 12, function() {
	var reconnectCount = 4, nextDelay = 20;
	
	$.socket("url", {
		server: function(request) {
			request[reconnectCount-- ? "reject" : "accept"]();
		},
		_reconnect: 20,
		reconnect: function(delay, attempts) {
			strictEqual(delay, nextDelay + attempts - 1);
			strictEqual(attempts + reconnectCount, 4);
			
			return delay + 1;
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
		setTimeout(start, 10);
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
		setTimeout(start, 10);
	});
});

asyncTest("in case of manual reconnection connecting event should be fired", function() {
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		},
		reconnect: false
	})
	.one("close", function() {
		$.socket().open().connecting(function() {
			ok(true);
			start();
		});
	});
});

module("Heartbeat", {
	setup: function() {
		setup();
		$.socket.defaults.heartbeat = 500;
		$.socket.defaults._heartbeat = 100;
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

module("Protocol", {
	setup: setup,
	teardown: teardown
});

test("url used for connection should be exposed by data('url')", function() {
	ok($.socket("url").data("url"));
});

test("url handler should receive the original url and a transport name and return a url to be used to establish a connection", function() {
	var socket;
	
	$.socket.defaults.url = function(url, transport) {
		socket = this;
		strictEqual(url, "url");
		strictEqual(transport, "test");
		
		return "modified";
	};
	
	strictEqual($.socket("url").data("url"), "modified");
	strictEqual(socket, $.socket());
});

asyncTest("outbound handler should receive a event object and return a final data to be sent to the server", function() {
	$.socket.defaults.outbound = function(event) {
		deepEqual(event, {type: "message", data: "data"});
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
		deepEqual($.parseJSON(data), {type: "message", data: "data"});
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

asyncTest("event object should contain a event type and optional data property", function() {
	var outbound;
	
	$.socket.defaults.inbound = function(event) {
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
		outbound = function(event) {
			deepEqual(event, {type: "message", data: {key: "value"}});
		};
		this.send({key: "value"});
		
		outbound = function(event) {
			deepEqual(event, {type: "chat", data: "data"});
		};
		this.send("chat", "data");
		
		outbound = function(event) {
			deepEqual(event, {type: "news", data: "data"});
		};
		this.find("news").send("data");
		
		this.one("message", function(data) {
			deepEqual(data, {key: "value"});
		})
		.notify({type: "message", data: {key: "value"}});
		
		this.one("chat", function(data) {
			strictEqual(data, "data");
		})
		.notify({type: "chat", data: "data"});
		
		this.find("news").one("message", function(data) {
			strictEqual(data, "data");
		})
		.notify({type: "news", data: "data"});
		
		start();
	});
});

test("transport used for connection should be exposed by data('transport')", function() {
	ok($.socket("url").data("transport"));
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

test("chunkParser handler should receive a chunk and return an array of data", function() {
	$.socket.defaults.chunkParser = function(chunk) {
		var array = chunk.split("@@");
		if (array.length > 1) {
			array[0] = (this.data("data") || "") + array[0];
			this.data("data", "");
			
			if (/@@$/.test(chunk)) {
				array.pop();
			}
			
			return array;
		} else {
			this.data("data", chunk);
		}
	};
	
	$.socket("url");
	ok(!$.socket.defaults.chunkParser.call($.socket(), "A"));
	deepEqual($.socket.defaults.chunkParser.call($.socket(), "A@@"), ["AA"]);
	deepEqual($.socket.defaults.chunkParser.call($.socket(), "A@@B@@C"), ["A", "B", "C"]);
});

module("Protocol default", {
	setup: setup,
	teardown: teardown
});

test("a final data to be sent to the server should be a JSON string representing a event object", function() {
	$.socket.transports.test = function(socket) {
		return {
			open: function() {
				socket.fire("open");
			},
			send: function(data) {
				try {
					deepEqual($.parseJSON(data), {type: "message", data: "data", socket: socket.data("id")});
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
				socket.notify($.stringifyJSON({type: "open", data: "data"}));
			},
			send: $.noop,
			close: $.noop
		};
	};
	
	$.socket("url").open(function(data) {
		strictEqual(data, "data");
	});
});

test("socket id used for connection should be exposed by data('id')", function() {
	ok($.socket("url").data("id"));
});

test("url should contain id, transport and heartbeat", function() {
	$.socket.transports.test = function(socket) {
		var url = socket.data("url");
		
		strictEqual(param(url, "id"), socket.data("id"));
		strictEqual(param(url, "transport"), "test");
		equal(param(url, "heartbeat"), socket.options.heartbeat);
	};
	
	$.socket("url");
});

test("chunks for streaming should accord with the event stream format", function() {
	deepEqual($.socket.defaults.chunkParser.call($.socket("url"), "data: A\r\n\r\ndata: A\r\ndata: B\rdata: C\n\r\ndata: \r\n"), ["A", "A\nB\nC", ""]);
});

function testTransport(transport, fn) {
	var url = "/jquery-socket-test/echo";
	
	if (QUnit.urlParams.crossdomain) {
		url = remoteURL + url;
	}
	if (!$.socket.transports[transport]($.socket(url, {transport: "test", enableXDR: true}).close(teardown).close())) {
		return;
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
	
	asyncTest("send method should work properly with big data", function() {
		var i, text = "A";
		
		for (i = 0; i < 32768; i++) {
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
			strictEqual(reason, "close");
			start();
		})
		.close();
	});
	
	asyncTest("close event whose the reason attribute is done should be fired when the server disconnects a connection cleanly", function() {
		$.socket(url + "?close=true").one("close", function(reason) {
			strictEqual(reason, "done");
			start();
		});
	});
	
	if (/^longpoll/.test(transport)) {
		asyncTest("data('url') should be modified whenever trying to connect to the server", 3, function() {
			var oldURL;
			
			$.socket(url).send(0).message(function(i) {
				var url = this.data("url");
				
				if (oldURL) {
					notStrictEqual(oldURL, url);
				}
				oldURL = url;
				
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
			$.socket.defaults.transport = "ws";
		},
		teardown: teardown
	});
	
	testTransport("ws", function(url) {
		test("url should be converted to accord with WebSocket specification", function() {
			ok(/^(?:ws|wss):\/\/.+/.test($.socket(url).data("url")));
		});
		
		asyncTest("WebSocket event should be able to be accessed by data('event')", function() {
			$.socket(url).open(function() {
				strictEqual(this.data("event").type, "open");
				this.send("data");
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
			$.socket.defaults.transport = "stream";
			$.socket.defaults.enableXDR = true;
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
		streamxdr: $.noop,
		streamiframe: $.noop,
		streamxhr: $.noop
	}, function(transport, fn) {
		var transportName = ({streamxdr: "XDomainRequest", streamiframe: "ActiveXObject('htmlfile')", streamxhr: "XMLHttpRequest"})[transport];
		
		module("Transport HTTP Streaming - " + transportName, {
			setup: function() {
				setup();
				$.socket.defaults.transport = transport;
				$.socket.defaults.enableXDR = transport === "streamxdr";
			},
			teardown: teardown
		});
		
		testTransport(transport, fn);
	});

	module("Transport Server-Sent Events", {
		setup: function() {
			setup();
			$.socket.defaults.transport = "sse";
		},
		teardown: teardown
	});
	
	testTransport("sse", function(url) {
		asyncTest("Server-Sent Events event should be able to be accessed by data('event')", function() {
			$.socket(url + "?close=true", {reconnect: false}).open(function() {
				strictEqual(this.data("event").type, "open");
				this.send("data");
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
			$.socket.defaults.transport = "longpoll";
		},
		teardown: teardown
	});
	
	test("longpoll transport should execute real transports", function() {
		var result = "";
		
		$.socket.transports.longpollxhr = function() {
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
		longpollxhr: $.noop,
		longpollxdr: $.noop, 
		longpolljsonp: function(url) {
			test("window should have a function whose name is equals to data('url')'s callback parameter", function() {
				ok($.isFunction(window[param($.socket(url).data("url"), "callback")]));
			});
		}
	}, function(transport, fn) {
		var transportName = ({longpollxhr: "XMLHttpRequest", longpollxdr: "XDomainRequest", longpolljsonp: "JSONP"})[transport];
		
		module("Transport HTTP Long Polling - " + transportName, {
			setup: function() {
				setup();
				$.socket.defaults.transport = transport;
				$.socket.defaults.enableXDR = transport === "longpollxdr";
			},
			teardown: teardown
		});
		
		testTransport(transport, fn);
	});
}