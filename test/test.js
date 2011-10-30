function teardown() {
	$(window).trigger("unload.socket");
}

module("jQuery.socket", {
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
	teardown: teardown
});

test("options property should include the given options", function() {
	$.socket("url", {version: $.fn.jquery});
	strictEqual($.socket("url", {version: $.fn.jquery}).options.version, $.fn.jquery);
});

test("on method should add callback", 4, function() {
	var type, 
		yes = function() {
			ok(true);
		};
	
	for (type in {open: 1, message: 1, fail: 1, done: 1}) {
		$.socket(type).on(type, yes).fire(type);
	}
});

test("off method should remove callback", 4, function() {
	var type, 
		yes = function() {
			ok(true);
		},
		no = function() {
			ok(false);
		};
		
	for (type in {open: 1, message: 1, fail: 1, done: 1}) {
		$.socket(type).on(type, yes, no).off(type, no).fire(type);
	}
});

$.each(["open", "message", "fail", "done"], function(i, name) {
	test(name + " method should add " + name + " callback" + (name !== "message" ? " - flags: once, memory" : ""), function() {
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

asyncTest("close method should delete socket reference", function() {
	var socket = $.socket("url").close();
	
	setTimeout(function() {
		notStrictEqual(socket, $.socket("url"));
		start();
	}, 10);
});

test("find method should find a logical sub socket", function() {
	ok($.socket("url").find("chat"));
});

module("Transport test", {
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
	}, start)
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
	}, start);
});

asyncTest("connection's send method should fire message event", function() {
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				connection.send("data");
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "data");
	}, start);
});

asyncTest("connection's close method should fire done event", function() {
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				connection.close();
			});
		}
	})
	.done(function() {
		ok(true);
	}, start);
});

asyncTest("connection's open event should be fired after socket's open event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				strictEqual(this, connection);
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
			var connection = request.accept();
			connection.on("message", function(data) {
				strictEqual(this, connection);
				strictEqual(data, "Hello");
				start();
			});
		}
	})
	.send("Hello");
});

asyncTest("connection's close event should be fired after socket's fail event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("close", function() {
				strictEqual(this, connection);
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

asyncTest("connection's close event handler should receive close code and reason", function() {
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
	teardown: teardown
});

asyncTest("open event handler should be executed when the connection has been established", function() {
	var socket = $.socket("url", {
		server: function(request) {
			request.accept();
		}
	})
	.open(function() {
		strictEqual(this, socket);
	}, start);
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
	}, start);
});

asyncTest("message event's data should be parsed into a string if dataType is 'text'", function() {
	$.socket("url", {
		dataType: "text",
		server: function(request) {
			request.accept().on("open", function() {
				this.send({name: "Donghwan"});
			});
		}
	})
	.message(function(data) {
		strictEqual(data, "[object Object]");
	}, start);
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
	}, start);
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
	}, start);
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
	}, start);
});

asyncTest("fail event's reason should be 'close' if the socket's close method has been called with no arguments", function() {
	$.socket("url")
	.fail(function(reason) {
		strictEqual(reason, "close");
	}, start)
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
	}, start);
});

asyncTest("fail event's reason should be 'timeout' if the socket has been timed out", function() {
	$.socket("url", {timeout: 100})
	.fail(function(reason) {
		strictEqual(reason, "timeout");
	}, start);
});

asyncTest("fail event's reason should be 'error' if the socket has been closed due to not specific error", function() {
	$.socket("url", {
		server: function(request) {
			request.reject();
		}
	})
	.fail(function(reason) {
		strictEqual(reason, "error");
	}, start);
});

asyncTest("done event handler should be executed when the connection has been closed cleanly", function() {
	var socket = $.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.done(function() {
		strictEqual(this, socket);
	}, start);
});

asyncTest("the reference to the socket should be removed when the connection has been closed", 2, function() {
	$.socket("url1", {
		server: function(request) {
			request.reject();
		}
	})
	.fail(function() {
		notStrictEqual(this, $.socket("url1"));
	});
	
	$.socket("url2", {
		server: function(request) {
			request.accept().on("open", function() {
				this.close();
			});
		}
	})
	.done(function() {
		notStrictEqual(this, $.socket("url2"));
	});
	
	setTimeout(start, 100);
});