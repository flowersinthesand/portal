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
		// Protocols
		protocols = {},
		// Transports
		transports = {},
		// Default options
		defaults = {
			type: "",
			reconnectDelay: 500,
			reconnect: function(delay, attempts) {
				return attempts > 1 ? 2 * delay : 0;
			}
		},
		// Reference to core prototype
		hasOwn = Object.prototype.hasOwnProperty;
	
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
			// Temporal object
			temp = {},
			// Socket object
			self = {
				// Final options object
				options: $.extend(true, {}, defaults, options),
				// Gets or sets a value
				data: function(key, value) {
					var ret = $(temp).data(key, value);
					return (ret && ret[0]) === temp ? this : ret || null;
				},
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
				fire: function(type, args) {
					var event = events[type];
					
					if (event) {
						event.fireWith(self, args);
					}
					
					return this;
				},
				// Fire helper for transport
				notify: function(data) {
					var i, event, events = $.makeArray(protocols.inbound.call(self, data));
					
					for (i = 0; i < events.length; i++) {
						event = events[i];
						self.fire(event.type, event.args || [event.data]);
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
					
					// Resets temporal object and event helpers
					temp = {};
					for (i in events) {
						events[i].reset();
					}
					
					// Chooses transport
					transport = undefined;
					for (i = 0; i < types.length; i++) {
						type = types[i];
						self.data("url", (protocols.url && protocols.url.call(self, url, type)) || url);
						
						transport = transports[type] && transports[type](self);
						if (transport) {
							// Fires connecting event
							self.data("transport", type).fire("connecting");
							transport.open();
							break;
						}
					}
					
					if (!transport) {
						self.close("notransport");
					}
					
					return this;
				},
				// Transmits data using the connection
				send: function(event, data) {
					if (state !== "opened") {
						buffer.push(arguments);
					} else if (transport) {
						if (data === undefined) {
							data = event;
							event = "message";
						}
						
						transport.send(self.data("transport") === "sub" ? data : protocols.outbound.call(self, {type: event, data: data}));
					}
					
					return this;
				},
				// Disconnects the connection
				close: function(reason) {
					// Prevents reconnection
					self.options.reconnect = false;
					if (reconnectTimer) {
						clearTimeout(reconnectTimer);
					}
					
					// Fires fail event
					self.fire("fail", [reason || "close"]);
					
					if (transport) {
						transport.close();
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
					self.close("timeout");
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
				self.send.apply(self, buffer.shift());
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
						self.fire("waiting", [reconnectDelay, reconnectTry]);
					}
				});
			}
		})
		.waiting(function() {
			state = "waiting";
		});
		
		return self.open();
	}
	
	// Protocols	
	$.extend(protocols, {
		inbound: function(data) {
			return $.parseJSON(data);
		},
		outbound: function(event) {
			event.socket = this.data("id");
			return $.stringifyJSON(event);
		},
		url: function(url, transport) {
			// UUID logic from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
			var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0,
					v = c === "x" ? r : (r & 0x3 | 0x8);
				
			    return v.toString(16);
			});
			
			// Stores the id
			this.data("id", id);
			
			// Attaches id and transport
			return url + (/\?/.test(url) ? "&" : "?") + $.param({id: id, transport: transport});
		}
	});
	
	// Transports
	$.extend(transports, {
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
					socket.fire("fail", [reason]);
				});
			})
			.done(function() {
				source.one("done", function() {
					socket.fire("done");
				});
			})
			.on(event, function() {
				source.one(event, function(data) {
					socket.fire("message", [data]);
				});
			});
			
			return {
				open: $.noop,
				send: function(data) {
					source.send(event, data);
				},
				close: function() {
					socket.fire("fail", ["close"]);
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
	$.socket.protocols = protocols; 
	$.socket.transports = transports;
	
})(jQuery);

/*
 * jQuery stringifyJSON
 * http://github.com/flowersinthesand/jquery-stringifyJSON
 * 
 * Copyright 2011, Donghwan Kim 
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// This plugin is heavily based on Douglas Crockford's reference implementation
(function($) {
	
	var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, 
		meta = {
			'\b' : '\\b',
			'\t' : '\\t',
			'\n' : '\\n',
			'\f' : '\\f',
			'\r' : '\\r',
			'"' : '\\"',
			'\\' : '\\\\'
		};
	
	function quote(string) {
		return '"' + string.replace(escapable, function(a) {
			var c = meta[a];
			return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
		}) + '"';
	}
	
	function f(n) {
		return n < 10 ? "0" + n : n;
	}
	
	function str(key, holder) {
		var i, v, len, partial, value = holder[key], type = typeof value;
				
		if (value && typeof value === "object" && typeof value.toJSON === "function") {
			value = value.toJSON(key);
			type = typeof value;
		}
		
		switch (type) {
		case "string":
			return quote(value);
		case "number":
			return isFinite(value) ? String(value) : "null";
		case "boolean":
			return String(value);
		case "object":
			if (!value) {
				return "null";
			}
			
			switch (Object.prototype.toString.call(value)) {
			case "[object Date]":
				return isFinite(value.valueOf()) ? '"' + value.getUTCFullYear() + "-" + f(value.getUTCMonth() + 1) + "-" + f(value.getUTCDate()) + "T" + 
						f(value.getUTCHours()) + ":" + f(value.getUTCMinutes()) + ":" + f(value.getUTCSeconds()) + "Z" + '"' : "null";
			case "[object Array]":
				len = value.length;
				partial = [];
				for (i = 0; i < len; i++) {
					partial.push(str(i, value) || "null");
				}
				
				return "[" + partial.join(",") + "]";
			default:
				partial = [];
				for (i in value) {
					if (Object.prototype.hasOwnProperty.call(value, i)) {
						v = str(i, value);
						if (v) {
							partial.push(quote(i) + ":" + v);
						}
					}
				}
				
				return "{" + partial.join(",") + "}";
			}
		}
	}
	
	$.stringifyJSON = function(value) {
		if (window.JSON && window.JSON.stringify) {
			return window.JSON.stringify(value);
		}
		
		return str("", {"": value});
	};
	
}(jQuery));