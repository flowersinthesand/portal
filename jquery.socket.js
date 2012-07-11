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

/*
 * jQuery Socket
 * http://github.com/flowersinthesand/jquery-socket
 * 
 * Copyright 2012, Donghwan Kim 
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
(function($, undefined) {
	
	var // Default options
		defaults,
		// Transports
		transports,
		// Socket instances
		sockets = {},
		// A global identifier
		guid = $.now(),
		// Callback names for JSONP
		jsonpCallbacks = [],
		// Is the unload event being processed?
		unloading;
	
	// From jQuery.Callbacks
	function callbacks(deferred) {
		var list = [],
			locked,
			memory,
			firing,
			firingStart,
			firingLength,
			firingIndex,
			fire = function(context, args) {
				args = args || [];
				memory = !deferred || [context, args];
				firing = true;
				firingIndex = firingStart || 0;
				firingStart = 0;
				firingLength = list.length;
				for (; firingIndex < firingLength; firingIndex++) {
					list[firingIndex].apply(context, args);
				}
				firing = false;
			},
			self = {
				add: function(fn) {
					var length = list.length;
					
					list.push(fn);
					if (firing) {
						firingLength = list.length;
					} else if (!locked && memory && memory !== true) {
						firingStart = length;
						fire(memory[0], memory[1]);
					}
				},
				remove: function(fn) {
					var i;
					
					for (i = 0; i < list.length; i++) {
						if (fn === list[i] || (fn.guid && fn.guid === list[i].guid)) {
							if (firing) {
								if (i <= firingLength) {
									firingLength--;
									if (i <= firingIndex) {
										firingIndex--;
									}
								}
							}
							list.splice(i--, 1);
						}
					}
				},
				fire: function(context, args) {
					if (!locked && !firing && !(deferred && memory)) {
						fire(context, args);
					}
				},
				lock: function() {
					locked = true;
				},
				locked: function() {
					return !!locked;
				},
				unlock: function() {
					locked = memory = firing = firingStart = firingLength = firingIndex = undefined;
				}
			};
		
		return self;
	}
	
	function isBinary(data) {
		var string = Object.prototype.toString.call(data);
		return string === "[object Blob]" || string === "[object ArrayBuffer]";
	}
	
	function iterate(fn) {
		var timeoutId;
		
		// Though the interval is 1ms for real-time application, there is a delay between setTimeout calls
		// For detail, see https://developer.mozilla.org/en/window.setTimeout#Minimum_delay_and_timeout_nesting
		(function loop() {
			timeoutId = setTimeout(function() {
				if (fn() === false) {
					return;
				}
				
				loop();
			}, 1);
		})();
		
		return function() {
			clearTimeout(timeoutId);
		};
	}
	
	function getAbsoluteURL(url) {
		return decodeURI($('<a href="' + url + '"/>')[0].href);
	}
	
	// Socket function
	function socket(url, options) {
		var	// Final options object
			opts,
			// Socket id,
			id,
			// Transport
			transport,
			// The state of the connection
			state,
			// Event helpers
			events = {},
			eventId = 0, 
			// Reply callbacks
			replyCallbacks = {},
			// Buffer
			buffer = [],
			// Reconnection
			reconnectTimer,
			reconnectDelay,
			reconnectTry,
			// Map of the session-scoped values
			session = {},
			// From jQuery.ajax
			parts = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/.exec(url.toLowerCase()),
			// Socket object
			self = {
				// Finds the value of an option
				option: function(key) {
					return opts[({id: "origId", url: "origURL"})[key] || key];
				},
				// Gets or sets a session-scoped value
				session: function(key, value) {
					if (value === undefined) {
						return session[key];
					}
					
					session[key] = value;
					
					return this;
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
						if (events.message.locked()) {
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
					function proxy() {
						self.off(type, proxy);
						fn.apply(this, arguments);
					}
					
					fn.guid = fn.guid || guid++;
					proxy.guid = fn.guid;
					
					return self.on(type, proxy);
				},
				// Fires event handlers
				fire: function(type, args) {
					var event = events[type];
					
					if (event) {
						event.fire(self, args);
					}
					
					return this;
				},
				// Establishes a connection
				open: function() {
					var type,
						latch,
						connect = function() {
							var candidates, type;
							
							if (!latch) {
								latch = true;
								candidates = session.candidates = $.makeArray(opts.transports);
								while (!transport && candidates.length) {
									type = candidates.shift();
									
									if (transports[type]) {
										session.transport = type;
										session.url = self.makeURL();
										transport = transports[type](self, opts);
									}
								}
								
								// Increases the number of reconnection attempts
								if (reconnectTry) {
									reconnectTry++;
								}
								
								// Fires the connecting event and connects
								if (transport) {
									self.fire("connecting");
									transport.open();
								} else {
									self.fire("close", ["notransport"]);
								}
							}
						},
						cancel = function() {
							if (!latch) {
								latch = true;
								self.fire("close", ["canceled"]);
							}
						};
					
					// Cancels the scheduled connection
					if (reconnectTimer) {
						clearTimeout(reconnectTimer);
						reconnectTimer = null;
					}
					
					// Resets the session scope and event helpers
					session = {};
					for (type in events) {
						events[type].unlock();
					}
					
					// Chooses transport
					transport = undefined;
					
					// Executes the prepare handler
					state = "preparing";
					opts.prepare.call(self, connect, cancel, opts);
					
					return this;
				},
				// Transmits event using the connection
				send: function(event, data, callback) {
					// Defers sending an event until the state become opened
					if (state !== "opened") {
						buffer.push(arguments);
					} else {
						// Standardize .send(data) and .send(data, callback) into .send(event, data, callback)
						if (data === undefined || $.isFunction(data)) {
							callback = data;
							data = event;
							event = "message";
						}
						
						eventId++;
						if (callback) {
							replyCallbacks[eventId] = callback;
						}
						
						// Delegates to the transport
						transport.send(isBinary(data) ? data : opts.outbound.call(self, {
							id: eventId, 
							socket: id, 
							type: event, 
							data: data,
							reply: !!callback
						}));
					}
					
					return this;
				},
				// Disconnects the connection
				close: function() {
					// Prevents reconnection
					opts.reconnect = false;
					if (reconnectTimer) {
						clearTimeout(reconnectTimer);
						reconnectTimer = null;
					}
					
					// Fires the close event immediately for transport which doesn't give feedback on disconnection
					if (unloading || !transport || !transport.feedback) {
						self.fire("close", [unloading ? "error" : "aborted"]);
					}
					
					// Delegates to the transport
					if (transport) {
						transport.close();
					}
					
					return this;
				},
				// For internal use only
				// Fires events from the server
				_notify: function(data, isChunk) {
					if (isChunk) {
						data = opts.streamParser.call(self, data);
						while (data.length) {
							self._notify(data.shift());
						}
					} else {
						$.each(isBinary(data) ? [{type: "message", data: data}] : $.makeArray(opts.inbound.call(self, data)), 
						function(i, event) {
							var type = event.type, args = [event.data], latch;
							
							opts.lastEventId = event.id;
							if (event.reply) {
								args.push(function(result) {
									if (!latch) {
										latch = true;
										self.send("reply", {id: event.id, data: result});
									}
								});
							}
							
							self.fire(type, args).fire("_message", [{type: type, args: args}]);
						});
					}
					
					return this;
				},
				// URL generator
				makeURL: function(params) {
					return opts.url.call(self, url, $.extend({
						id: id, 
						transport: session.transport, 
						heartbeat: opts.heartbeat, 
						lastEventId: opts.lastEventId,
						_: $.now()
					}, opts.params, params));
				}
			};
		
		opts = $.extend(true, {}, defaults, options);
		if (options) {
			if (options.transports) {
				opts.transports = options.transports;
			}
		}
		opts.origURL = url;
		opts.origId = id = opts.id.call(self);
		opts.crossDomain = !!(parts && 
			// protocol and hostname
			(parts[1] != location.protocol || parts[2] != location.hostname ||
			// port
			(parts[3] || (parts[1] === "http:" ? 80 : 443)) != (location.port || (location.protocol === "http:" ? 80 : 443))));
		
		$.each(["connecting", "open", "message", "close", "waiting"], function(i, type) {
			// Creates event helper
			events[type] = callbacks(type !== "message");
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
		
		// Initializes
		self.connecting(function() {
			var timeoutTimer;
			
			// Sets timeout timer
			function setTimeoutTimer() {
				timeoutTimer = setTimeout(function() {
					transport.close();
					self.fire("close", ["timeout"]);
				}, opts.timeout);
			}
			
			// Clears timeout timer
			function clearTimeoutTimer() {
				clearTimeout(timeoutTimer);
			}
			
			// Makes the socket sharable
			function share() {
				var server, 
					name = "socket-" + url,
					servers = {
						// Powered by the storage event and the localStorage
						// http://www.w3.org/TR/webstorage/#event-storage
						storage: function() {
							if (!$.support.storageEvent) {
								return;
							}
							
							var storage = window.localStorage;
							
							return {
								init: function() {
									// Handles the storage event 
									$(window).on("storage.socket", function(event) {
										event = event.originalEvent;
										// When a deletion, newValue initialized to null
										if (event.key === name && event.newValue) {
											listener(event.newValue);
										}
									});									
									self.one("close", function(reason) {
										$(window).off("storage.socket");
										// Defers again to clean the storage
										self.one("close", function() {
											storage.removeItem(name);
											storage.removeItem(name + "-opened");
											storage.removeItem(name + "-children");
										});
									});
								},
								signal: function(type, data) {
									storage.setItem(name, $.stringifyJSON({target: "c", type: type, data: data}));
								},
								get: function(key) {
									return $.parseJSON(storage.getItem(name + "-" + key));
								},
								set: function(key, value) {
									storage.setItem(name + "-" + key, $.stringifyJSON(value));
								}
							};
						},
						// Powered by the window.open method
						// https://developer.mozilla.org/en/DOM/window.open
						windowref: function() {
							// Internet Explorer raises an invalid argument error
							// when calling the window.open method with the name containing non-word characters
							var neim = name.replace(/\W/g, ""),
								win = ($('iframe[name="' + neim + '"]')[0] 
									|| $('<iframe name="' + neim + '" />').hide().appendTo("body")[0]).contentWindow;
							
							return {
								init: function() {
									// Callbacks from different windows
									win.callbacks = [listener];
									// In IE 8 and less, only string argument can be safely passed to the function in other window
									win.fire = function(string) {
										var i;
										
										for (i = 0; i < win.callbacks.length; i++) {
											win.callbacks[i](string);
										}
									};
								},
								signal: function(type, data) {
									if (!win.closed && win.fire) {
										win.fire($.stringifyJSON({target: "c", type: type, data: data}));
									}
								},
								get: function(key) {
									return !win.closed ? win[key] : null;
								},
								set: function(key, value) {
									if (!win.closed) {
										win[key] = value;
									}
								}
							};
						}
					};
				
				// Receives send and close command from the children
				function listener(string) {
					var command = $.parseJSON(string), data = command.data;
					
					if (command.target === "p") {
						switch (command.type) {
						// TODO support a reply event
						case "send":
							self.send(data.type, data.data);
							break;
						case "close":
							self.close();
							break;
						}
					}
				}
				
				function propagateMessageEvent(context) {
					server.signal("message", context);
				}
				
				// Leaves traces
				document.cookie = encodeURIComponent(name) + "=" + $.now();
				
				// Chooses a server
				server = servers.storage() || servers.windowref();
				server.init();
				
				// List of children sockets
				server.set("children", []);
				// Flag indicating the parent socket is opened
				server.set("opened", false);
				
				self.on("_message", propagateMessageEvent)
				.one("open", function() {
					server.set("opened", true);
					server.signal("open");
				})
				.one("close", function(reason) {
					self.off("_message", propagateMessageEvent);
					// The heir is the parent unless unloading
					server.signal("close", {reason: reason, heir: !unloading ? id : server.get("children")[0]});
					document.cookie = encodeURIComponent(name) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
				});
			}
			
			state = "connecting";
			
			if (opts.timeout > 0) {
				setTimeoutTimer();				
				self.one("open", clearTimeoutTimer).one("close", clearTimeoutTimer);
			}
			
			// For now, opera is not supported due to the unload event
			if (opts.sharing && session.transport !== "local" && !$.browser.opera) {
				share();
			}
		})
		.open(function() {
			var heartbeatTimer;
			
			// Sets heartbeat timer
			function setHeartbeatTimer() {
				heartbeatTimer = setTimeout(function() {
					self.send("heartbeat", null).one("heartbeat", function() {
						clearHeartbeatTimer();
						setHeartbeatTimer();
					});
					
					heartbeatTimer = setTimeout(function() {
						transport.close();
						self.fire("close", ["error"]);
					}, opts._heartbeat);
				}, opts.heartbeat - opts._heartbeat);
			}
			
			// Clears heartbeat timer
			function clearHeartbeatTimer() {
				clearTimeout(heartbeatTimer);
			}
			
			state = "opened";
			
			if (opts.heartbeat > opts._heartbeat) {
				setHeartbeatTimer();
				self.one("close", clearHeartbeatTimer);
			}
			
			// Locks the connecting event
			events.connecting.lock();
			
			// Initializes variables related with reconnection
			reconnectTimer = reconnectDelay = reconnectTry = null;
			
			// Flushes buffer
			while (buffer.length) {
				self.send.apply(self, buffer.shift());
			}
		})
		.close(function() {
			var type, event, order = events.close.order;
			
			state = "closed";
			
			// Locks event whose order is lower than close event
			for (type in events) {
				event = events[type];
				if (event.order < order) {
					event.lock();
				}
			}
			
			// Handles reconnection
			if (opts.reconnect) {
				self.one("close", function() {
					reconnectTry = reconnectTry || 1;
					reconnectDelay = opts.reconnect.call(self, reconnectDelay, reconnectTry);
					
					if (reconnectDelay !== false) {
						reconnectTimer = setTimeout(function() {
							self.open();
						}, reconnectDelay);
						self.fire("waiting", [reconnectDelay, reconnectTry]);
					}
				});
			}
		})
		.waiting(function() {
			state = "waiting";
		})
		.on("reply", function(reply) {
			if (replyCallbacks[reply.id]) {
				replyCallbacks[reply.id].call(self, reply.data);
				delete replyCallbacks[reply.id];
			}
		});
		
		return self.open();
	}
	
	$.support.storageEvent = (function() {
		var storage = window.localStorage;
		if (storage) {
			try {
				storage.setItem("t", "t");
				storage.removeItem("t");
				// Internet Explorer 9 has no StorageEvent object but supports the storage event
				return !!window.StorageEvent || Object.prototype.toString.call(storage) === "[object Storage]";
			} catch (e) {}
		}
		
		return false;
	})();
	
	// Default options
	defaults = {
		transports: ["local", "ws", "sse", "stream", "longpoll"],
		timeout: false,
		heartbeat: false,
		_heartbeat: 5000,
		lastEventId: "",
		credentials: false,
		sharing: true,
		prepare: function(connect) {
			connect();
		},
		reconnect: function(lastDelay) {
			return 2 * (lastDelay || 250);
		},
		id: function() {
			// Generates a random UUID 
			// Logic borrowed from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
			return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0,
					v = c === "x" ? r : (r & 0x3 | 0x8);
				
				return v.toString(16);
			});
		},
		url: function(url, params) {
			return url + (/\?/.test(url) ? "&" : "?") + $.param(params);
		},
		inbound: $.parseJSON,
		outbound: $.stringifyJSON,
		xdrURL: function(url) {
			// Maintaining session by rewriting URL
			// http://stackoverflow.com/questions/6453779/maintaining-session-by-rewriting-url
			var match = /(?:^|;\s*)(JSESSIONID|PHPSESSID)=([^;]*)/.exec(document.cookie);
			
			switch (match && match[1]) {
			case "JSESSIONID":
				return url.replace(/;jsessionid=[^\?]*|(\?)|$/, ";jsessionid=" + match[2] + "$1");
			case "PHPSESSID":
				return url.replace(/\?PHPSESSID=[^&]*&?|\?|$/, "?PHPSESSID=" + match[2] + "&").replace(/&$/, "");
			default:
				return false;
			}
		},
		streamParser: function(chunk) {
			// Chunks are formatted according to the event stream format 
			// http://www.w3.org/TR/eventsource/#event-stream-interpretation
			var reol = /\r\n|\r|\n/g, lines = [], data = this.session("data"), array = [], i = 0, 
				match, line;
			
			// String.prototype.split is not reliable cross-browser
			while (match = reol.exec(chunk)) {
				lines.push(chunk.substring(i, match.index));
				i = match.index + match[0].length;
			}
			lines.push(chunk.length === i ? "" : chunk.substring(i));
			
			if (!data) {
				data = [];
				this.session("data", data);
			}
			
			// Processes the data field only
			for (i = 0; i < lines.length; i++) {
				line = lines[i];
				if (!line) {
					// Finish
					array.push(data.join("\n"));
					data = [];
					this.session("data", data);
				} else if (/^data:\s/.test(line)) {
					// A single data field
					data.push(line.substring("data: ".length));
				} else {
					// A fragment of a data field
					data[data.length - 1] += line;
				}
			}
			
			return array;
		}
	};
	
	// Transports
	transports = {
		// Local socket
		local: function(socket, options) {
			var connector, orphan,
				name = "socket-" + options.origURL,
				connectors = {
					storage: function() {
						if (!$.support.storageEvent) {
							return;
						}
						
						var storage = window.localStorage,
							get = function(key) {
								return $.parseJSON(storage.getItem(name + "-" + key));
							},
							set = function(key, value) {
								storage.setItem(name + "-" + key, $.stringifyJSON(value));
							};
						
						return {
							init: function() {
								set("children", get("children").concat([options.origId]));
								$(window).on("storage.socket", function(event) {
									event = event.originalEvent;
									if (event.key === name && event.newValue) {
										listener(event.newValue);
									}
								});
								
								socket.one("close", function() {
									var index, children = get("children");
									
									$(window).off("storage.socket");
									if (children) {
										index = $.inArray(options.origId, children);
										if (index > -1) {
											children.splice(index, 1);
											set("children", children);
										}
									}
								});
								
								return get("opened");
							},
							signal: function(type, data) {
								storage.setItem(name, $.stringifyJSON({target: "p", type: type, data: data}));
							}
						};
					},
					windowref: function() {
						var win = window.open("", name.replace(/\W/g, ""));
						
						if (!win || win.closed || !win.callbacks) {
							return;
						}
						
						return {
							init: function() {
								win.callbacks.push(listener);
								win.children.push(options.origId);
								
								socket.one("close", function() {
									function remove(array, e) {
										var index = $.inArray(e, array);
										if (index > -1) {
											array.splice(index, 1);
										}
									}
									
									// Removes traces only if the parent is alive
									if (!orphan) {
										remove(win.callbacks, listener);
										remove(win.children, options.origId);
									}
								});
								
								return win.opened;
							},
							signal: function(type, data) {
								if (!win.closed && win.fire) {
									win.fire($.stringifyJSON({target: "p", type: type, data: data}));
								}
							}
						};
					}
				};
			
			// Receives open, close and message command from the parent 
			function listener(string) {
				var command = $.parseJSON(string), data = command.data;
				
				if (command.target === "c") {
					switch (command.type) {
					case "open":
						socket.fire("open");
						break;
					case "close":
						orphan = true;
						if (data.reason === "aborted") {
							socket.close();
						} else {
							// Gives the heir some time to reconnect 
							if (data.heir === options.origId) {
								socket.fire("close", [data.reason]);
							} else {
								setTimeout(function() {
									socket.fire("close", [data.reason]);
								}, 100);
							}
						}
						break;
					case "message":
						// When using the local transport, message events could be sent before the open event
						if (socket.state() === "connecting") {
							socket.one("open", function() {
								socket.fire(data.type, data.args);
							});
						} else {
							socket.fire(data.type, data.args);
						}
						break;
					}
				}
			}
			
			// Finds the parent socket's traces from the cookie
			if (!new RegExp("(?:^|;\s*)(" + encodeURIComponent(name) + ")=([^;]*)").test(document.cookie)) {
				return;
			}
			
			// Chooses a connector
			connector = connectors.storage() || connectors.windowref();
			if (!connector) {
				return;
			}
			
			return {
				open: function() {
					var parentOpened,
						timeout = options.timeout, 
						heartbeat = options.heartbeat, 
						outbound = options.outbound;
					
					// Prevents side effects
					options.timeout = options.heartbeat = false;
					options.outbound = function(arg) {
						return arg;
					};
					
					// Restores options
					socket.one("close", function() {
						options.timeout = timeout;
						options.heartbeat = heartbeat;
						options.outbound = outbound;
					});
					
					parentOpened = connector.init();
					if (parentOpened) {
						// Firing the open event without delay robs the user of the opportunity to bind connecting event handlers
						setTimeout(function() {
							socket.fire("open");
						}, 1);
					}
				},
				send: function(event) {
					connector.signal("send", event);
				},
				close: function() {
					// Do not signal the parent if this method is executed by the unload event handler
					if (!unloading) {
						connector.signal("close");
					}
				}
			};
		},
		// WebSocket
		ws: function(socket) {
			var WebSocket = window.WebSocket || window.MozWebSocket,
				ws, aborted;
			
			if (!WebSocket) {
				return;
			}
			
			return {
				feedback: true,
				open: function() {
					// Makes an absolute url whose scheme is ws or wss
					var url = getAbsoluteURL(socket.session("url")).replace(/^http/, "ws");
					
					socket.session("url", url);
					
					ws = new WebSocket(url);
					ws.onopen = function(event) {
						socket.session("event", event).fire("open");
					};
					ws.onmessage = function(event) {
						socket.session("event", event)._notify(event.data);
					};
					ws.onerror = function(event) {
						socket.session("event", event).fire("close", [aborted ? "aborted" : "error"]);
					};
					ws.onclose = function(event) {
						socket.session("event", event).fire("close", [aborted ? "aborted" : event.wasClean ? "done" : "error"]);
					};
				},
				send: function(data) {
					ws.send(data);
				},
				close: function() {
					aborted = true;
					ws.close();
				}
			};
		},
		// HTTP Support
		http: function(socket, options) {
			var send,
				sending,
				queue = [];
			
			function post() {
				if (queue.length) {
					send(options.origURL, queue.shift());
				} else {
					sending = false;
				}
			}
			
			// The Content-Type is not application/x-www-form-urlencoded but text/plain on account of XDomainRequest
			// See the fourth at http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
			send = !options.crossDomain || $.support.cors ? 
			function(url, data) {
				$.ajax(url, {
					type: "POST", 
					contentType: "text/plain; charset=UTF-8", 
					data: "data=" + data, 
					async: true, 
					timeout: false, 
					xhrFields: $.support.cors ? {withCredentials: options.credentials} : null
				})
				.always(post);
			} : window.XDomainRequest && options.xdrURL && options.xdrURL.call(socket, "t") ? 
			function(url, data) {
				var xdr = new window.XDomainRequest();
				
				xdr.onload = xdr.onerror = post;
				xdr.open("POST", options.xdrURL.call(socket, url));
				xdr.send("data=" + data);
			} : 
			function(url, data) {
				var $form = $("<form method='POST' enctype='text/plain' accept-charset='UTF-8' />"),
					$iframe = $("<iframe name='socket-" + (++guid) + "'/>");
				
				$form.attr({action: url, target: $iframe.attr("name")}).hide().appendTo("body")
				.append($("<textarea name='data' />").val(data))
				.append($iframe)
				.submit();
				
				$iframe.load(function() {
					$form.remove();
					post();
				});
			};
			
			return {
				send: function(data) {
					queue.push(data);
					
					if (!sending) {
						sending = true;
						post();
					}
				}
			};
		},
		// Server-Sent Events
		sse: function(socket, options) {
			var EventSource = window.EventSource,
				es;
			
			if (!EventSource) {
				return;
			} else if (options.crossDomain) {
				try {
					if (!("withCredentials" in new EventSource("about:blank"))) {
						return;
					}
				} catch(e) {
					return;
				}
			}
			
			return $.extend(transports.http(socket, options), {
				open: function() {
					es = new EventSource(socket.session("url"), {withCredentials: options.credentials});
					es.onopen = function(event) {
						socket.session("event", event).fire("open");
					};
					es.onmessage = function(event) {
						socket.session("event", event)._notify(event.data);
					};
					es.onerror = function(event) {
						es.close();
						
						// There is no way to find whether this connection closed normally or not 
						socket.session("event", event).fire("close", ["done"]);
					};
				},
				close: function() {
					es.close();
				}
			});
		},
		// Streaming facade
		stream: function(socket) {
			socket.session("candidates").unshift("streamxdr", "streamiframe", "streamxhr");
		},
		// Streaming - XMLHttpRequest
		streamxhr: function(socket, options) {
			var XMLHttpRequest = window.XMLHttpRequest, 
				xhr, aborted;
			
			if (!XMLHttpRequest || window.XDomainRequest || window.ActiveXObject || (options.crossDomain && !$.support.cors)) {
				return;
			}
			
			return $.extend(transports.http(socket, options), {
				open: function() {
					var stop;
					
					xhr = new XMLHttpRequest();
					xhr.onreadystatechange = function() {
						function onprogress() {
							var index = socket.session("index"),
								length = xhr.responseText.length;
							
							if (!index) {
								socket.fire("open");
							} else if (length > index) {
								socket._notify(xhr.responseText.substring(index, length), true);
							}
							
							socket.session("index", length);
						}
						
						if (xhr.readyState === 3 && xhr.status === 200) {
							// Despite the change in response, Opera doesn't fire the readystatechange event
							if ($.browser.opera && !stop) {
								stop = iterate(onprogress);
							} else {
								onprogress();
							}
						} else if (xhr.readyState === 4) {
							if (stop) {
								stop();
							}
							
							socket.fire("close", [aborted ? "aborted" : xhr.status === 200 ? "done" : "error"]);
						}
					};
					
					xhr.open("GET", socket.session("url"));
					xhr.withCredentials = options.credentials;
					
					xhr.send(null);
				},
				close: function() {
					aborted = true;
					xhr.abort();
				}
			});
		},
		// Streaming - Iframe
		streamiframe: function(socket, options) {
			var ActiveXObject = window.ActiveXObject,
				doc, stop;
			
			if (!ActiveXObject || options.crossDomain) {
				return;
			}
			
			return $.extend(transports.http(socket, options), {
				open: function() {
					var iframe, cdoc;
					
					doc = new ActiveXObject("htmlfile");
					doc.open();
					doc.close();
					
					iframe = doc.createElement("iframe");
					iframe.src = socket.session("url");
					doc.body.appendChild(iframe);
					
					cdoc = iframe.contentDocument || iframe.contentWindow.document;
					stop = iterate(function() {
						if (!cdoc.firstChild) {
							return;
						}
						
						var response = cdoc.body.lastChild;
						
						// Detects connection failure
						if (!response) {
							socket.fire("close", ["error"]);
							return false;
						}
						
						response.innerText = "";
						socket.fire("open");
						
						stop = iterate(function() {
							var clone = response.cloneNode(true), 
								text;
							
							// Adds a character not CR and LF to circumvent an Internet Explorer bug
							// If the contents of an element ends with one or more CR or LF, Internet Explorer ignores them in the innerText property 
							clone.appendChild(cdoc.createTextNode("."));
							text = clone.innerText;
							text = text.substring(0, text.length - 1);
							
							if (text) {
								response.innerText = "";
								socket._notify(text, true);
							}
							
							if (cdoc.readyState === "complete") {
								socket.fire("close", ["done"]);
								return false;
							}
						});
						
						return false;
					});
				},
				close: function() {
					stop();
					doc.execCommand("Stop");
				}
			});
		},
		// Streaming - XDomainRequest
		streamxdr: function(socket, options) {
			var XDomainRequest = window.XDomainRequest,
				xdr;
			
			if (!XDomainRequest || !options.xdrURL || !options.xdrURL.call(socket, "t")) {
				return;
			}
			
			return $.extend(transports.http(socket, options), {
				open: function() {
					var url = options.xdrURL.call(socket, socket.session("url"));
					
					socket.session("url", url);
					
					xdr = new XDomainRequest();
					xdr.onprogress = function() {
						var index = socket.session("index"), 
							length = xdr.responseText.length;
						
						if (!index) {
							socket.fire("open");
						} else {
							socket._notify(xdr.responseText.substring(index, length), true);
						}
						
						socket.session("index", length);
					};
					xdr.onerror = function() {
						socket.fire("close", ["error"]);
					};
					xdr.onload = function() {
						socket.fire("close", ["done"]);
					};
					
					xdr.open("GET", url);
					xdr.send();
				},
				close: function() {
					xdr.abort();
				}
			});
		},
		// Long polling facade
		longpoll: function(socket) {
			socket.session("candidates").unshift("longpollajax", "longpollxdr", "longpolljsonp");
		},
		// Long polling - AJAX
		longpollajax: function(socket, options) {
			var count = 0, xhr;
			
			if (!$.support.ajax || (options.crossDomain && !$.support.cors)) {
				return;
			}
			
			function poll() {
				var url = socket.makeURL({count: ++count}),
					done = function(data) {
						if (data || count === 1) {
							if (count === 1) {
								socket.fire("open");
							}
							if (data) {
								socket._notify(data);
							}
							poll();
						} else {
							socket.fire("close", ["done"]);
						}
					},
					fail = function(jqXHR, reason) {
						socket.fire("close", [reason === "abort" ? "aborted" : "error"]);
					};
				
				socket.session("url", url);
				xhr = $.ajax(url, {
					type: "GET", 
					dataType: "text", 
					async: true, 
					cache: true, 
					timeout: false,
					xhrFields: $.support.cors ? {withCredentials: options.credentials} : null
				})
				.then(done, fail);
			}
			
			return $.extend(transports.http(socket, options), {
				open: poll,
				close: function() {
					xhr.abort();
				}
			});
		},
		// Long polling - XDomainRequest
		longpollxdr: function(socket, options) {
			var XDomainRequest = window.XDomainRequest, count = 0, xdr;
			
			if (!XDomainRequest || !options.xdrURL || !options.xdrURL.call(socket, "t")) {
				return;
			}
			
			function poll() {
				var url = options.xdrURL.call(socket, socket.makeURL({count: ++count})),
					done = function() {
						var data = xdr.responseText;
						
						if (data || count === 1) {
							if (count === 1) {
								socket.fire("open");
							}
							if (data) {
								socket._notify(data);
							}
							poll();
						} else {
							socket.fire("close", ["done"]);
						}
					},
					fail = function() {
						socket.fire("close", ["error"]);
					};
				
				xdr = new XDomainRequest();
				xdr.onload = done;
				xdr.onerror = fail;
				
				socket.session("url", url);
				xdr.open("GET", url);
				xdr.send();
			}
			
			return $.extend(transports.http(socket, options), {
				open: poll,
				close: function() {
					xdr.abort();
				}
			});
		},
		// Long polling - JSONP
		longpolljsonp: function(socket, options) {
			var count = 0, callback = jsonpCallbacks.pop() || ("socket_" + (++guid)), xhr, called;
			
			// Attaches callback
			window[callback] = function(data) {
				called = true;
				if (count === 1) {
					socket.fire("open");
				}
				socket._notify(data);
			};
			socket.one("close", function() {
				// Assings an empty function for browsers which are not able to cancel a request made from script tag
				window[callback] = $.noop;
				jsonpCallbacks.push(callback);
			});
			
			function poll() {
				var url = socket.makeURL({callback: callback, count: ++count}),
					done = function() {
						if (called) {
							called = false;
							poll();
						} else if (count === 1) {
							socket.fire("open");
							poll();
						} else {
							socket.fire("close", ["done"]);
						}
					},
					fail = function(jqXHR, reason) {
						socket.fire("close", [reason === "abort" ? "aborted" : "error"]);
					};
				
				socket.session("url", url);
				xhr = $.ajax(url, {
					dataType: "script", 
					crossDomain: true, 
					cache: true, 
					timeout: false
				})
				.then(done, fail);
			}
			
			return $.extend(transports.http(socket, options), {
				open: poll,
				close: function() {
					xhr.abort();
				}
			});
		}
	};
	
	// Closes all socket when the document is unloaded 
	$(window).on("unload.socket", function(event) {
		// Check the unload event is fired by the browser
		unloading = !!event.originalEvent;
		
		var url, socket;
		
		for (url in sockets) {
			socket = sockets[url];
			if (socket.state() !== "closed") {
				socket.close();
			}
			
			// To run the test suite
			delete sockets[url];
		}
	});
	
	$.socket = function(url, options) {
		var i;
		
		// Returns the first socket in the document
		if (!url) {
			for (i in sockets) {
				if (sockets[i]) {
					return sockets[i];
				}
			}
			return null;
		}
		
		// The url is a identifier of this socket within the document
		url = getAbsoluteURL(url);
		
		// Socket to which the given url is mapped
		if (sockets[url]) {
			return sockets[url];
		}
		
		return (sockets[url] = socket(url, options));
	};
	
	$.socket.sockets = sockets;
	$.socket.defaults = defaults;
	$.socket.transports = transports;
	
})(jQuery);