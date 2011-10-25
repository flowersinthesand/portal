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
	equal(socket, $.socket("url"));
	
	notEqual(Object.prototype.toString, $.socket("toString"));
});

test("jQuery.socket() should return the first socket object", function() {
	Object.prototype.property = 1;
	equal(null, $.socket());
	delete Object.prototype.property;
	
	var first = $.socket("first", {});
	
	equal(first, $.socket());
	
	var second = $.socket("second", {});
	
	notEqual(second, $.socket());
	equal(first, $.socket());
});

module("Socket object", {
	teardown: teardown
});

test("options property should include the given options", function() {
	$.socket("url", {version: $.fn.jquery});
	equal($.socket("url", {version: $.fn.jquery}).options.version, $.fn.jquery);
});

$.each(["open", "message", "error", "close"], function(i, name) {
	test(name + " method should add " + name + " callback" + (name !== "message" ? " - flags: once, memory" : ""), function() {
		var result = "",
			out = function(string) {
				return function() {
					result += string;
				}
			};
		
		$.socket("url")[name](out("A"))[name](out("B"))[name].fire();
		$.socket("url")[name](out("C"));
		
		equal(result, name !== "message" ? "ABC" : "AB");
	});
});

asyncTest("send method should defer sending message when the socket is not connected", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("message", function(data) {
				result += data;
				if (result == "ABC") {
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

test("close method should delete socket reference", function() {
	var socket = $.socket("url").close();
	
	notEqual(socket, $.socket("url"));
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
		}
	})
	.open(function() {
		ok(false);
	})
	.close(function() {
		ok(false);
	});
	
	setTimeout(start, 100);
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
	.close(function() {
		ok(false);
	});
});

asyncTest("request's reject method should fire close event", function() {
	$.socket("url", {
		server: function(request) {
			ok(!request.reject());
		}
	})
	.open(function() {
		ok(false);
	})
	.close(function() {
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
		equal(data, "data");
	}, start);
});

asyncTest("connection's close method should fire close event", function() {
	$.socket("url", {
		server: function(request) {
			var connection = request.accept();
			connection.on("open", function() {
				connection.close();
			});
		}
	})
	.close(function() {
		ok(true);
	}, start);
});

asyncTest("connection's open event should be fired after socket's open event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("open", function() {
				result += "B";
				equal(result, "AB");
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
				equal(data, "Hello");
				start();
			});
		}
	})
	.send("Hello");
});

asyncTest("connection's close event should be fired after socket's close event", function() {
	var result = "";
	
	$.socket("url", {
		server: function(request) {
			request.accept().on("close", function() {
				result += "B";
				equal(result, "AB");
				start();
			})
		}
	})
	.close(function() {
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