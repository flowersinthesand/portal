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

test("send method should defer sending message when the socket is not connected", function() {
	var result = "";
	
	$.socket("url").send("A").send("B").open.fire(function(string) {
		result += string;
	});
	$.socket("url").send("C");
	
	equal(result, "ABC");
});

test("close method should delete socket reference", function() {
	var socket = $.socket("url").close();
	
	notEqual(socket, $.socket("url"));
});

test("find method should find a logical sub socket", function() {
	ok($.socket("url").find("chat"));
});