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
		// Default options
		defaults = {
			type: "test",
			reconnectDelay: 500,
			reconnect: function(delay, attempts) {
				return attempts > 1 ? 2 * delay : 0;
			}
		},
		// Reference to core prototype
		hasOwn = Object.prototype.hasOwnProperty,
		slice = Array.prototype.slice;
	
	// A resettable callback
	function callbacks(flags) {
		var list = [],
			wrapper = {},
			wrapped = $.Callbacks(flags);
		
		$.each(wrapped, function(key) {
			wrapper[key] = function() {
				return wrapped[key].apply(this, arguments);
			};
		});
		
		return $.extend(wrapper, {
			add: function() {
				var args = arguments;
				
				if (!wrapped.disabled()) {
					$.merge(list, args);
				}
				
				return wrapped.add.apply(this, args); 
			},
			remove: function() {
				var i, j, args = arguments;
				
				if (!wrapped.disabled()) {
					for (i = 0; i < args.length; i++) {
						for (j = 0; j < list.length; j++) {
							if (args[i] === list[j]) {
								list.splice(j--, 1);
							}
						}
					}
				}
				
				return wrapped.remove.apply(this, args);
			},
			reset: function() {
				wrapped.disable();
				wrapped = $.Callbacks(flags);
				return wrapped.add.apply(this, list);
			}
		});
	}
	
	// Socket is based on The WebSocket API 
	// W3C Working Draft 29 September 2011 - http://www.w3.org/TR/2011/WD-websockets-20110929/
	function socket(url, options) {
		var // Transport
			transport,
			// Timeout id
			timeoutId,
			// The state of the connection
			oldState,
			state,
			// Socket event
			event = {
				connecting: callbacks("once memory"),
				open: callbacks("once memory"),
				message: callbacks(),
				fail: callbacks("once memory"),
				done: callbacks("once memory"),
				close: callbacks("once memory")
			},
			// Buffer
			buffer = [],
			// Reconnection
			reconnectDelay,
			reconnectTry,
			// Socket object
			self = {
				// Final options object
				options: $.extend(true, {}, defaults, options),
				// Returns the state
				state: function() {
					return state;
				},
				// Adds event handler
				on: function(type, fn) {
					// For custom event
					if (!event[type] && state !== "closed") {
						event[type] = callbacks();
					}
					
					if (event[type]) {
						event[type].add(fn);
					}
					
					return this;
				},
				// Removes event handler
				off: function(type, fn) {
					if (event[type]) {
						event[type].remove(fn);
					}
					
					return this;
				},
				// Adds one time event handler 
				one: function(type, fn) {
					var proxy = function() {
							self.off(type, proxy);
							fn.apply(this, arguments);
						};
					
					return self.on(type, proxy);
				},
				// Fires event handlers
				fire: function(type) {
					var context = this,
						args = slice.call(arguments, 1);
					
					// Parses data
					if (type === "message" && self.options.dataType && typeof args[0] === "string" && self.options.dataType !== "text") {
						try {
							args[0] = ({json: $.parseJSON, xml: $.parseXML})[self.options.dataType](args[0]);
						} catch (e) {
							return self.close(0, "parseerror");
						}
					}
					
					if (event[type]) {
						event[type].fire.apply(context, args);
					}
					
					return this;
				},
				// Establishes a connection
				open: function() {
					var type;
					
					for (type in event) {
						event[type].reset();
					}
					
					// Fires connecting event If this is first connection attempt
					if (!oldState) {
						self.fire("connecting", 0, 0);
					}
					
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
					
					return this;
				},
				// Transmits data using the connection
				send: function(event, data) {
					// TODO stringify
					data = data !== undefined ? {event: event, data: data} : event;
					
					if (state !== "opened") {
						buffer.push(data);
					} else if (transport) {
						transport.send(data);
					}
					
					return this;
				},
				// Disconnects the connection
				close: function(code, reason) {
					self.options.reconnect = false;
					
					if (transport) {
						transport.close(code || 0, reason || "close");
					}
					
					return this;
				},
				// Finds a sub socket communicating with this socket
				find: function(name) {
					return $.socket(url + "/" + name, {type: "sub", event: name, source: url, timeout: 0, init: true, reconnect: false});
				}
			};
		
		// Shortcuts for on method
		$.each(event, function(type) {
			var old = self[type],
				on = function(fn) {
					return self.on(type, fn);
				};
			
			event[type].reserved = true;
			self[type] = !old ? on : function(fn) {
				return ($.isFunction(fn) ? on : old).apply(this, arguments);
			};
		});
		
		// Initializes
		self.connecting(function() {
			state = "connecting";
			
			if (oldState === "connecting") {
				reconnectTry++;
			}
		})
		.open(function() {
			state = "opened";
			
			// Clears timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			
			// Disables connecting event
			event.connecting.disable();
			
			// Initializes variables related with reconnection
			reconnectDelay = reconnectTry = null;
			
			// Flushes buffer
			while (buffer.length) {
				self.send(buffer.shift());
			}
		})
		.message(function(data) {
			var eventName, eventHandler;
			
			// Fires custom event
			if (data) {
				eventName = data.event;
				if (eventName) {
					eventHandler = event[eventName];
					if (eventHandler && !eventHandler.reserved) {
						self.one("message", function() {
							self.fire(eventName, data.data);
						});
					}
				}
			}
		})
		.fail(function() {
			var type, excludes = ["close", "fail"];
			
			oldState = state;
			state = "closed";
			
			// Disables open, message and custom events
			for (type in event) {
				if ($.inArray(type, excludes) < 0) {
					event[type].disable();
				}
			}
			
			// Prepares close event
			self.one("fail", function() {
				self.fire("close");
			});
		})
		.done(function() {
			var type, excludes = ["close", "done"];
			
			oldState = state;
			state = "closed";

			// Disables open, message and custom events
			for (type in event) {
				if ($.inArray(type, excludes) < 0) {
					event[type].disable();
				}
			}
			
			// Prepares close event
			self.one("done", function() {
				self.fire("close");
			});
		})
		.close(function() {
			self.one("close", function() {
				// Handles reconnection
				if (self.options.reconnect) {
					reconnectTry = reconnectTry || 1;
					reconnectDelay = self.options.reconnect(reconnectDelay || self.options.reconnectDelay, reconnectTry);
					
					if (reconnectDelay !== false) {
						setTimeout(self.open, reconnectDelay);
						
						event.connecting.reset();
						self.fire("connecting", reconnectDelay, reconnectTry);
					}
				}
			});
		});
		
		return self.open();
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
							connectionEvent.triggerHandler("close", [1000, null]);
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
					if (socket.options.init) {
						source.open(function() {
							if (socket.state() === "closed") {
								socket.options.init = false;
								socket.open();
							}
							
							source.one("open", function() {
								socket.fire("open");
							});
						})
						.fail(function(reason) {
							source.one("fail", function() {
								socket.fire("fail", reason);
							});
						})
						.done(function() {
							source.one("done", function() {
								socket.fire("done");
							});
						})
						.on(event, function(data) {
							source.one(event, function() {
								socket.fire("message", data);
							});
						});
					}
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
		$.each(sockets, function(url, socket) {
			if (socket.state() !== "closed") {
				socket.close();
			}
		});
		
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
	
	$.socket.defaults = defaults;
	
})(jQuery);