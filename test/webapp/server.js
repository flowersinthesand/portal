(function() {
	var transport, 
		url = QUnit.urlParams.url || ((typeof window === "undefined" ? "http://localhost:8080" : "") +  "/test"),
		crossDomain = !new RegExp("^" + portal.support.getAbsoluteURL("/")).test(portal.support.getAbsoluteURL(url)), 
		transports = QUnit.urlParams.transports && QUnit.urlParams.transports.split(",") || portal.defaults.transports,
		text2KB = (function() {
			var i, text = "A";
			
			for (i = 0; i < 2048; i++) {
				text += "A";
			}
			
			return text;
		})(),
		groups = {
			ws: {
				can: function() {
					return typeof WebSocket !== "undefined";
				}
			},
			sse: {
				can: function() {
					return typeof EventSource !== "undefined";
				}
			},
			streamxhr: {
				can: function(crossDomain) {
					return typeof XMLHttpRequest !== "undefined" && (!portal.support.browser.msie || +portal.support.browser.version.split(".")[0] > 9) && 
						(!crossDomain || portal.support.corsable);
				}
			},
			streamxdr: {
				can: function() {
					return typeof XDomainRequest !== "undefined";
				},
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
				can: function(crossDomain) {
					try {
						// In IE 11 typeof ActiveXObject is undefined, 
						// but new ActiveXObject("htmlfile") returns something but doesn't work 
						return ActiveXObject && new ActiveXObject("htmlfile") && !crossDomain;
					} catch(e) {
						return false;
					}
				}
			},
			longpollajax: {
				can: function(crossDomain) {
					return !crossDomain || portal.support.corsable;
				}
			},
			longpollxdr: {
				can: function() {
					return typeof XDomainRequest !== "undefined";
				},
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
				can: function() {
					return true;
				}
			}
		};

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
		asyncTest("transport should support reply by server", function() {
			var ready;
			
			portal.open(url)
			.send("do-reply", true, function(echo) {
				strictEqual(echo, true);
				if (ready) {
					start();
				} else {
					ready = true;
				}
			}, helper.okFalse)
			.send("do-reply", false, helper.okFalse, function(echo) {
				strictEqual(echo, false);
				if (ready) {
					start();
				} else {
					ready = true;
				}
			});
		});
	}
	
	if (typeof document !== "undefined") {
		(function() {
			var toolbar = document.getElementById("qunit-testrunner-toolbar"),
				div = document.createElement("div");
			
			div.appendChild(document.createTextNode(portal.support.getAbsoluteURL(url) + " (" + transports.join(",") + ")"));
			toolbar.appendChild(div);
		})();
	} else {
		// If Node.js
		groups.ws.can = groups.sse.can = groups.longpollajax.can = function() {
			return true;
		};
		groups.longpolljsonp.can = function() {
			return false;
		};
	}

	while(transports.length) {
		transport = transports.shift();
		if (transport === "stream") {
			transports.unshift("streamxhr", "streamxdr", "streamiframe");
			continue;
		} else if (transport === "longpoll") {
			transports.unshift("longpollajax", "longpollxdr", "longpolljsonp");
			continue;
		}
		
		(function(transport, group) {
			if (group) {
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
				if (group.can(crossDomain)) {
					group.test && group.test();
					transportTest();
				} else {
					test(transport + " is not supported by the browser", helper.okTrue);
				}
			} else {
				QUnit.module(transport);
				test(transport + " is not supported by the portal", helper.okFalse);
			}
		})(transport, groups[transport]);
	}
})();