var url = "http://" + (typeof location !== "undefined" ? location.hostname : "localhost") + ":8080/test",
	isNode = typeof exports === "object",
	isCrossDomain = !new RegExp("^" + portal.support.getAbsoluteURL("/")).test(portal.support.getAbsoluteURL(url)), 
	text2KB = (function() {
		var i, text = "A";
		
		for (i = 0; i < 2048; i++) {
			text += "A";
		}
		
		return text;
	})();

helper.each({
	ws: {
		can: isNode || typeof WebSocket !== "undefined"
	},
	sse: {
		can: isNode || typeof EventSource !== "undefined"
	},
	streamxhr: {
		can: typeof XMLHttpRequest !== "undefined" && 
			(!portal.support.browser.msie || +portal.support.browser.version.split(".")[0] > 9) && 
				(!isCrossDomain || portal.support.corsable)
	},
	streamxdr: {
		can: typeof XDomainRequest !== "undefined",
		setup: function() {
			portal.defaults.xdrURL = function(url) {
				return url;
			};
		},
		test: function() {
			test("transprot should be skipped if xdrURL is false", 1, function() {
				portal.open(url, {xdrURL: false}).close(function(reason) {
					strictEqual(reason, "notransport");
				});
			});
			test("transport should be skipped if xdrURL returns false", 1, function() {
				portal.open(url, {
					xdrURL: function() {
						return false;
					}
				})
				.close(function(reason) {
					strictEqual(reason, "notransport");
				});
			});
		}
	},
	streamiframe: {
		can: (function() {
			try {
				// In IE 11 typeof ActiveXObject is undefined, 
				// but new ActiveXObject("htmlfile") returns something but doesn't work 
				return ActiveXObject && new ActiveXObject("htmlfile") && !isCrossDomain;
			} catch(e) {
				return false;
			}
		})()
	},
	longpollajax: {
		can: isNode || (!isCrossDomain || portal.support.corsable)
	},
	longpollxdr: {
		can: typeof XDomainRequest !== "undefined",
		setup: function() {
			portal.defaults.xdrURL = function(url) {
				return url;
			};
		},
		test: function() {
			test("transprot should be skipped if xdrURL is false", 1, function() {
				portal.open(url, {xdrURL: false}).close(function(reason) {
					strictEqual(reason, "notransport");
				});
			});
			test("transport should be skipped if xdrURL returns false", 1, function() {
				portal.open(url, {
					xdrURL: function() {
						return false;
					}
				})
				.close(function(reason) {
					strictEqual(reason, "notransport");
				});
			});
		}
	},
	longpolljsonp: {
		can: !isNode
	}
}, function(transport, group) {
	QUnit.module(transport, {
		setup: function() {
			helper.setup();
			portal.defaults.transports = [transport];
			portal.defaults.notifyAbort = true;
			if (group.setup) {
				group.setup();
			}
		},
		teardown: function() {
			helper.teardown();
			if (group.teardown) {
				group.teardown();
			}
		}
	});
	
	if (group.can) {
		transportTest();
		if (group.test) {
			group.test();
		}
	} else {
		test(transport + " is not supported by the browser", helper.okTrue);
	}
});

function transportTest() {
	asyncTest("transport should estabish a connection on socket.open()", 1, function() {
		portal.open(url).open(function() {
			ok(true);
			start();
		});
	});
	
	asyncTest("transport should be able to exchange an event", 1, function() {
		portal.open(url).on("echo", function(data) {
			strictEqual(data, "data");
			start();
		})
		.send("echo", "data");
	});
	
	asyncTest("transport should be able to exchange one hundred of event with the interval of 1ms", 1, function() {
		var i, array = [], returned = [];
		
		for (i = 0; i < 100; i++) {
			array.push(i + 1);
		}
		
		portal.open(url).on({
			open: function() {
				var self = this;
				for (i = 0; i < array.length; i++) {
					(function(elem) {
						setTimeout(function() {
							self.send("echo", elem);
						}, 1);
					})(array[i]);
				}
			},
			echo: function(data) {
				returned.push(data);
				if (returned.length === array.length) {
					returned.sort(function(a, b) {
						return a - b;
					});
					deepEqual(returned, array);
					start();
				}
			}
		});
	});
	
	asyncTest("trnasport should be able to exchange an event consisting of multi-byte characters", 1, function() {
		portal.open(url).on("echo", function(data) {
			strictEqual(data, "안녕");
			start();
		})
		.send("echo", "안녕");
	});
	
	asyncTest("transport should be able to exchange an event of 2KB", 1, function() {
		portal.open(url).on("echo", function(data) {
			strictEqual(data, text2KB);
			start();
		})
		.send("echo", text2KB);
	});
	
	asyncTest("transport should close connection on socket.close()", 1, function() {
		portal.open(url).open(function() {
			ok(true);
			this.close();
		})
		.close(function() {
			start();
		});
	});
	
	asyncTest("transport should be notified of close", 1, function() {
		portal.open(url).open(function() {
			this.send("disconnect");
			ok(true);
		})
		.close(function() {
			start();
		});
	});
	
	// From now on they are fully tested in client.js and have nothing to do with 
	// transport itself, but are provided to help to implement the portal server
	
	asyncTest("transport should support reply by server", 2, function() {
		var ready;
		
		portal.open(url).send("reply-by-server", true, function(echo) {
			strictEqual(echo, true);
			if (ready) {
				start();
			} else {
				ready = true;
			}
		}, helper.okFalse)
		.send("reply-by-server", false, helper.okFalse, function(echo) {
			strictEqual(echo, false);
			if (ready) {
				start();
			} else {
				ready = true;
			}
		});
	});
	
	asyncTest("transport should support reply by client", 1, function() {
		portal.open(url).on("reply-by-client", function(data, reply) {
			ok(true);
			reply("echo");
		})
		.on("echo", function() {
			start();
		})
		.send("reply-by-client");
	});
	
	asyncTest("transport should support heartbeat", 5, function() {
		var i = 0;
		
		portal.open(url, {heartbeat: 1500, _heartbeat: 500}).on("heartbeat", function() {
			i++;
			ok(true);
			if (i > 4) {
				start();
			}
		});
	});
}