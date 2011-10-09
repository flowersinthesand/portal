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
	
	var first = $.socket("first", {});
	
	equal(first, $.socket());
	
	var second = $.socket("second", {});
	
	notEqual(second, $.socket());
	equal(first, $.socket());
	
	delete Object.prototype.property;
});