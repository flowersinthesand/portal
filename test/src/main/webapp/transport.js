(function($) {
	
	function isBinary(data) {
		var string = Object.prototype.toString.call(data);
		return string === "[object Blob]" || string === "[object ArrayBuffer]";
	}
	
	function param(url, name) {
		var match = new RegExp("[?&]" + name + "=([^&]+)").exec(url);
		return match ? decodeURIComponent(match[1]) : null;
	}
	
	/*
	 * stringifyJSON
	 * http://github.com/flowersinthesand/stringifyJSON
	 * 
	 * Copyright 2011, Donghwan Kim 
	 * Licensed under the Apache License, Version 2.0
	 * http://www.apache.org/licenses/LICENSE-2.0
	 */
	function stringifyJSON(value) {
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
		
		return window.JSON && window.JSON.stringify ? window.JSON.stringify(value) : (function str(key, holder) {
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
					return isFinite(value.valueOf()) ? 
						'"' + value.getUTCFullYear() + "-" + f(value.getUTCMonth() + 1) + "-" + f(value.getUTCDate()) + 
						"T" + f(value.getUTCHours()) + ":" + f(value.getUTCMinutes()) + ":" + f(value.getUTCSeconds()) + "Z" + '"' : 
						"null";
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
		})("", {"": value});
	}
	
	// The server-side view of the socket handling
	portal.transports.test = function(socket, options) {
		var // Is it accepted?
			accepted,
			// Connection object for the server
			connection;
		
		return {
			feedback: true,
			open: function() {
				var // Event id
					eventId = 0,
					// Reply callbacks
					callbacks = {},
					// Heartbeat
					heartbeat,
					heartbeatTimer,
					// Request object for the server
					request = {
						accept: function() {
							accepted = true;
							return connection.on("open", function() {
								socket.fire("open");
								heartbeat = param(socket.data("url"), "heartbeat");
								if (heartbeat > 0) {
									heartbeatTimer = setTimeout(function() {
										socket.fire("close", "error");
									}, heartbeat);
								}
							})
							.on("heartbeat", function() {
								if (heartbeatTimer) {
									clearTimeout(heartbeatTimer);
									heartbeatTimer = setTimeout(function() {
										socket.fire("close", "error");
									}, heartbeat);
									connection.send("heartbeat");
								}
							})
							.on("reply", function(reply) {
								if (callbacks[reply.id]) {
									callbacks[reply.id].call(connection, reply.data);
									delete callbacks[reply.id];
								}
							})
							.on("close", function() {
								if (heartbeatTimer) {
									clearTimeout(heartbeatTimer);
								}
							});
						},
						reject: function() {
							accepted = false;
						}
					};
				
				connection = {
					event: $({}),
					send: function(event, data, callback) {
						setTimeout(function() {
							if (accepted) {
								eventId++;
								if (callback) {
									callbacks[eventId] = callback;
								}
								socket._fire(isBinary(data) ? data : stringifyJSON({
									id: eventId, 
									reply: !!callback,
									type: event, 
									data: data
								}));
							}
						}, 5);
						return this;
					}, 
					close: function() {
						setTimeout(function() {
							if (accepted) {
								socket.fire("close", "done");
								connection.event.triggerHandler("close");
							}
						}, 5);
						return this;
					},
					on: function(type, fn) {
						connection.event.on(type, function() {
							var args = Array.prototype.slice.call(arguments, 1);
							try {
								fn.apply(connection, args);
							} catch (exception) {
								if (args[1]) {
									args[1](exception, true);
								}
							}
						});
						return this;
					}
				};
				
				if (options.server) {
					options.server(request);
				}
				
				setTimeout(function() {
					switch (accepted) {
					case true:
						connection.event.triggerHandler("open");
						break;
					case false:
						socket.fire("close", "error");
						break;
					}
				}, 5);
			},
			send: function(data) {
				setTimeout(function() {
					if (accepted) {
						var latch,
							event = isBinary(data) ? {type: "message", data: data} : $.parseJSON(data),
							args = [event.data];
						
						if (event.reply) {
							args.push(function(result, exception) {
								if (!latch) {
									latch = true;
									connection.send("reply", {id: event.id, data: result, exception: exception});
								}
							});
						}
						
						connection.event.triggerHandler(event.type, args);
					}
				}, 5);
			},
			close: function() {
				setTimeout(function() {
					socket.fire("close", "aborted");
					if (accepted) {
						connection.event.triggerHandler("close");
					}
				}, 5);
			}
		};
	};
})(jQuery);