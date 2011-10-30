/*
 * jQuery Socket
 * http://github.com/flowersinthesand/jquery-socket
 * 
 * Copyright 2011, Donghwan Kim 
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
(function($, undefined) {

	var // Sockets
		sockets = {},
		// Transports
		transports = {},
		// Reference to core prototype
		hasOwn = Object.prototype.hasOwnProperty,
		slice = Array.prototype.slice;

	// Socket is based on The WebSocket API 
	// W3C Working Draft 29 September 2011 - http://www.w3.org/TR/2011/WD-websockets-20110929/
	function socket(url, options) {
		var // Transport
			transport,
			// Timeout id
			timeoutId,
			// The state of the connection
			state = "connecting",
			// Socket event
			event = {
				open: $.Callbacks("once memory"),
				message: $.Callbacks(""),
				fail: $.Callbacks("once memory"),
				done: $.Callbacks("once memory")
			},
			// Socket object
			self = {
				// Final options object
				options: $.extend(true, {
					type: "test"
				}, options),
				// Returns the state
				state: function() {
					return state;
				},
				// Shortcuts for on method
				open: event.open.add,
				message: event.message.add,
				fail: event.fail.add,
				done: event.done.add,
				// Adds event handlers
				on: function(type) {
					// For custom event
					if (!event[type] && state !== "closed") {
						event[type] = $.Callbacks("");
					}
					
					return event[type] ? event[type].add.apply(this, slice.call(arguments, 1)) : this;
				},
				// Removes event handlers
				off: function(type) {
					return event[type] ? event[type].remove.apply(this, slice.call(arguments, 1)) : this;
				},
				// Fires event handlers
				fire: function(type) {
					var i,
						context = this,
						args = slice.call(arguments, 1);
					
					switch (type) {
					case "open":
						state = "opened";
						// Clears timeout
						if (timeoutId) {
							clearTimeout(timeoutId);
						}
						break;
						
					case "message":
						// Parses message data
						if (self.options.dataType && typeof args[0] === "string" && self.options.dataType !== "text") {
							try {
								args[0] = ({json: $.parseJSON, xml: $.parseXML})[self.options.dataType](args[0]);
							} catch (e) {
								return self.close(0, "parseerror");
							}
						}
						
						// Custom event handlers
						if (event[args[0] && args[0].event]) {
							self.fire(args[0].event, args[0].data);
						}
						break;
						
					case "fail":
					case "done":
						state = "closed";
						// Disables all other handlers
						for (i in event) {
							if (i !== type && hasOwn.call(event, i)) {
								event[i].disable();
							}
						}
						delete sockets[url];
						break;
					}
					
					return event[type] ? event[type].fire.apply(context, args) : this;
				},
				// Transmits data using the connection
				send: function(event, data) {
					return self.open(function() {
						if (transport) {
							// TODO stringify
							transport.send(data !== undefined ? {event: event, data: data} : event);
						}
					});
				},
				// Disconnects the connection
				close: function(code, reason) {
					if (transport) {
						transport.close(code || 0, reason || "close");
					}
					
					return this;
				},
				// Finds a sub socket communicating with this socket
				find: function(name) {
					return $.socket(url + "/" + name, {type: "sub", event: name, source: url});
				}
			};
		
		if (hasOwn.call(transports, self.options.type)) {
			transport = transports[self.options.type](self);
			transport.open();
			
			// Sets timeout
			if (self.options.timeout > 0) {
				timeoutId = setTimeout(function() {
					self.close(0, "timeout");
				}, self.options.timeout);
			}
		}
		
		return self;
	}
	
	$.extend(transports, {
		// The server-side view of the socket handling
		test: function(socket) {
			var // Is it accepted?
				accepted,
				// Creates a function delaying its execution to simulate network delay
				delay = function(fn) {
					return function() {
						var context = this,
							args = arguments;
						
						setTimeout(function() {
							fn.apply(context, args);
						}, 5);
						
						return context;
					};
				},
				// Connection event helper
				connectionEvent = $({}),
				// Connection object for the server
				connection = {
					send: delay(function(data) {
						if (socket.state() === "opened") {
							socket.fire("message", data);
						}
					}),
					close: delay(function() {
						if (socket.state() === "opened") {
							socket.fire("done");
							connectionEvent.triggerHandler("close", [1005, null]);
						}
					}),
					on: function(type, fn) {
						connectionEvent.on(type, function() {
							fn.apply(connection, slice.call(arguments, 1));
						});
						return this;
					}
				},
				// Request object for the server
				request = {
					accept: function() {
						accepted = true;
						return connection;
					},
					reject: function() {
						accepted = false;
					}
				};
			
			if (socket.options.server) {
				socket.options.server(request);
			}
			
			return {
				open: delay(function() {
					switch (accepted) {
					case true:
						socket.fire("open");
						connectionEvent.triggerHandler("open");
						break;
					case false:
						socket.fire("fail", "error");
						break;
					}
				}),
				send: delay(function(data) {
					if (accepted) {
						connectionEvent.triggerHandler("message", [data]);
					}
				}),
				close: delay(function(code, reason) {
					socket.fire("fail", reason);
					if (accepted) {
						connectionEvent.triggerHandler("close", [code, reason]);
					}
				})
			};
		},
		// Sub socket implementation
		sub: function(socket) {
			var // Event
				event = socket.options.event,
				// Source socket
				source = sockets[socket.options.source];
			
			return {
				open: function() {
					source.open(function() {
						socket.fire("open");
					})
					.fail(function(reason) {
						socket.fire("fail", reason);
					})
					.done(function() {
						socket.fire("done");
					})
					.on(event, function(data) {
						socket.fire("message", data);
					});
				},
				send: function(data) {
					source.send(event, data);
				},
				close: function(code, reason) {
					socket.fire("fail", reason);
				}
			};
		}
	});

	$(window).on("unload.socket", function() {
		sockets = {};
	});
	
	$.socket = function(url, options) {
		var i;

		// Returns the first socket in the document
		if (!url) {
			for (i in sockets) {
				if (hasOwn.call(sockets, i)) {
					return sockets[i];
				}
			}
			return null;
		}
		
		// Socket to which the given url is mapped
		if (hasOwn.call(sockets, url)) {
			return sockets[url];
		}
		
		// The url is a identifier of this socket within the document
		return (sockets[url] = socket(url, options));
	};
	
})(jQuery);