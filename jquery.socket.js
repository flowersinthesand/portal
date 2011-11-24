/*
 * jQuery Socket
 * http://github.com/flowersinthesand/jquery-socket
 * 
 * Copyright 2011, Donghwan Kim 
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
(function($, undefined) {
	
	var // Socket events
		socketEvents = "connecting open message fail done close waiting".split(" "),
		// Sockets
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
			// Timeout
			timeoutTimer,
			// The state of the connection
			oldState,
			state,
			// Event helpers
			events = {},
			// Buffer
			buffer = [],
			// Reconnection
			reconnectTimer,
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
					var event = events[type];
					
					// For custom event
					if (!event) {
						if (events.message.disabled()) {
							return this;
						}
						
						event = events[type] = callbacks();
						event.order = events.message.order;
					}
					
					event.add(fn);
					
					return this;
				},
				// Removes event handler
				off: function(type, fn) {
					var event = events[type];
					
					if (event) {
						event.remove(fn);
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
					var event = events[type],
						args = slice.call(arguments, 1);
					
					// Parses data
					if (type === "message" && self.options.dataType && typeof args[0] === "string" && self.options.dataType !== "text") {
						try {
							args[0] = ({json: $.parseJSON, xml: $.parseXML})[self.options.dataType](args[0]);
						} catch (e) {
							return self.close(0, "parseerror");
						}
					}
					
					if (event) {
						event.fire.apply(self, args);
					}
					
					return this;
				},
				// Establishes a connection
				open: function() {
					var type,
						i = 0,
						types = $.makeArray(self.options.type);
					
					// Cancels the scheduled connection
					if (reconnectTimer) {
						clearTimeout(reconnectTimer);
					}
					
					// Exposes url
					self.options.url = url;
					
					// Chooses transport if not exists
					while (!transport && i < types.length) {
						type = types[i++];
						transport = transports[type](self);
					}
					
					// Resets event helpers
					for (i in events) {
						events[i].reset();
					}
					
					// Fires connecting event
					self.fire("connecting");
					
					if (transport) {
						transport.open();
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
					// Prevents reconnection
					self.options.reconnect = false;
					if (reconnectTimer) {
						clearTimeout(reconnectTimer);
					}
					
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
		
		$.each(socketEvents, function(i, type) {
			// Creates event helper
			events[type] = callbacks(type === "message" ? "" : "once memory");
			events[type].order = i;
			
			// Shortcuts for on method
			var old = self[type],
				on = function(fn) {
					return self.on(type, fn);
				};
			
			self[type] = !old ? on : function(fn) {
				return ($.isFunction(fn) ? on : old).apply(this, arguments);
			};
		});
		
		// done event and fail event are mutually exclusive 
		events.done.order = events.fail.order;
		
		// Initializes
		self.connecting(function() {
			state = "connecting";
			
			if (oldState === "connecting") {
				reconnectTry++;
			}
			
			// Sets timeout
			if (self.options.timeout > 0) {
				timeoutTimer = setTimeout(function() {
					self.close(0, "timeout");
				}, self.options.timeout);
			}
		})
		.open(function() {
			state = "opened";
			
			// Clears timeout
			if (timeoutTimer) {
				clearTimeout(timeoutTimer);
			}
			
			// Disables connecting event
			events.connecting.disable();
			
			// Initializes variables related with reconnection
			reconnectTimer = reconnectDelay = reconnectTry = null;
			
			// Flushes buffer
			while (buffer.length) {
				self.send(buffer.shift());
			}
		})
		.message(function(data) {
			var eventName, event;
			
			// Fires custom event
			if (data) {
				eventName = data.event;
				if (eventName) {
					event = events[eventName];
					if (event && event.order === events.message.order) {
						self.one("message", function() {
							self.fire(eventName, data.data);
						});
					}
				}
			}
		})
		.fail(function() {
			oldState = state;
			state = "closed";
			
			var type, event, order = events.fail.order;
			
			// Disables done event and event whose order is lower than fail event
			events.done.disable();
			for (type in events) {
				event = events[type];
				if (event.order < order) {
					event.disable();
				}
			}
			
			// Prepares close event
			self.one("fail", function() {
				self.fire("close");
			});
		})
		.done(function() {
			oldState = state;
			state = "closed";
			
			var type, event, order = events.done.order;
			
			// Disables fail event and event whose order is lower than done event
			events.fail.disable();
			for (type in events) {
				event = events[type];
				if (event.order < order) {
					event.disable();
				}
			}
			
			// Prepares close event
			self.one("done", function() {
				self.fire("close");
			});
		})
		.close(function() {
			// Handles reconnection
			if (self.options.reconnect) {
				self.one("close", function() {
					reconnectTry = reconnectTry || 1;
					reconnectDelay = self.options.reconnect(reconnectDelay || self.options.reconnectDelay, reconnectTry);
					
					if (reconnectDelay !== false) {
						reconnectTimer = setTimeout(self.open, reconnectDelay);
						self.fire("waiting", reconnectDelay, reconnectTry);
					}
				});
			}
		})
		.waiting(function() {
			state = "waiting";
		});
		
		return self.open();
	}
	
	$.extend(transports, {
		// The server-side view of the socket handling
		test: function(socket) {
			var // Is it accepted?
				accepted,
				// Connection event helper
				connectionEvent;
			
			return {
				open: function() {
					var // Connection object for the server
						connection = {
							send: function(data) {
								setTimeout(function() {
									if (socket.state() === "opened") {
										socket.fire("message", data);
									}
								}, 5);
								return this;
							},
							close: function() {
								setTimeout(function() {
									if (socket.state() === "opened") {
										socket.fire("done");
										connectionEvent.triggerHandler("close", [1000, null]);
									}
								}, 5);
								return this;
							},
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
								connectionEvent = connectionEvent || $({});
								return connection;
							},
							reject: function() {
								accepted = false;
							}
						};
					
					accepted = connectionEvent = undefined;
					if (socket.options.server) {
						socket.options.server(request);
					}
					
					setTimeout(function() {
						switch (accepted) {
						case true:
							socket.fire("open");
							connectionEvent.triggerHandler("open");
							break;
						case false:
							socket.fire("fail", "error");
							break;
						}
					}, 5);
				},
				send: function(data) {
					setTimeout(function() {
						if (accepted) {
							connectionEvent.triggerHandler("message", [data]);
						}
					}, 5);
				},
				close: function(code, reason) {
					setTimeout(function() {
						socket.fire("fail", reason);
						if (accepted) {
							connectionEvent.triggerHandler("close", [code, reason]);
						}
					}, 5);
				}
			};
		},
		// Sub socket implementation
		sub: function(socket) {
			var // Event
				event = socket.options.event,
				// Source socket
				source = $.socket(socket.options.source);
			
			socket.options.timeout = 0;
			socket.options.reconnect = false;
			
			source.open(function() {
				if (socket.state() === "closed") {
					socket.open();
				}
				
				source.one("open", function() {
					socket.fire("open");
				});
			})
			.fail(function() {
				source.one("fail", function(reason) {
					socket.fire("fail", reason);
				});
			})
			.done(function() {
				source.one("done", function() {
					socket.fire("done");
				});
			})
			.on(event, function() {
				source.one(event, function(data) {
					socket.fire("message", data);
				});
			});
			
			return {
				open: $.noop,
				send: function(data) {
					source.send(event, data);
				},
				close: function(code, reason) {
					socket.fire("fail", reason);
				}
			};
		}
	});
	
	// Closes all socket when the document is unloaded 
	$(window).on("unload.socket", function() {
		var url, socket;
		
		for (url in sockets) {
			socket = sockets[url];
			if (socket.state() !== "closed") {
				socket.close();
			}
		}
		
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
	$.socket.transports = transports;
	
})(jQuery);