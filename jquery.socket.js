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
		transports = {};
	
	// Socket is based on The WebSocket API 
	// W3C Working Draft 29 September 2011 - http://www.w3.org/TR/2011/WD-websockets-20110929/
	$.socket = function(url, options) {

		// Returns the first socket in the document
		if (!url) {
			for (var i in sockets) {
				if (sockets.hasOwnProperty(i)) {
					return sockets[i];
				}
			}
			return null;
		}
		
		// Socket to which the given url is mapped
		if (sockets.hasOwnProperty(url)) {
			return sockets[url];
		}
		
		var // Transport
			transport,
			// Socket object
			socket = {
				// Final options object
				options: $.extend(true, {
					type: "test"
				}, options),
				// Transmits data using the connection
				send: function(data) {
					return socket.open(function() {
						if (transport) {
							transport.send(data);
						}
					});
				},
				// Disconnects the connection
				close: function(code, reason) {
					if (transport) {
						transport.close(code, reason);
					}
					delete sockets[url];
					return socket;
				},
				// Finds a logical sub socket communicating with this socket
				find: function(name) {
					return $.socket(url + "/" + name);
				}
			};

		$.each({
			open: "once memory",
			message: "",
			error: "once memory",
			close: "once memory"
		}, function(type, flags) {
			var old = socket[type];
			
			function handler(fn) {
				var args = arguments;
				
				if (old && !$.isFunction(fn)) {
					return old.apply(socket, args);
				}
				
				handler.add.apply(handler, args);
				
				return socket;
			}
			
			socket[type] = $.extend(handler, $.Callbacks(flags));
		});
		
		if (socket.options.type in transports) {
			transport = transports[socket.options.type](socket);
			transport.open();
		}
		
		// The url is a identifier of this socket within the document
		sockets[url] = socket;
		
		return socket;
	};
	
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
						}, 10);
						
						return context;
					};
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
				},
				// Connection object for the server
				connection = {
					send: delay(function(data) {
						if (socket.open.fired()) {
							socket.message.fire(data);
						}
					}),
					close: delay(function() {
						if (socket.open.fired()) {
							socket.close.fire();
						}
					}),
					on: function(type, fn) {
						event.on(type, function() {
							fn.apply(connection, Array.prototype.slice.call(arguments, 1));
						});
						return connection;
					}
				},
				// Connection event helper
				event = $({});
			
			if (socket.options.server) {
				socket.options.server(request);
			}
			
			return {
				open: delay(function() {
					switch (accepted) {
					case true:
						socket.open.fire();
						event.triggerHandler("open");
						break;
					case false:
						socket.close.fire();
						break;
					}
				}),
				send: delay(function(data) {
					if (accepted) {
						event.triggerHandler("message", [data]);
					}
				}),
				close: delay(function(code, reason) {
					if (accepted) {
						socket.close.fire();
						event.triggerHandler("close", [code, reason]);
					}
				})
			};
		}
	});

	$(window).on("unload.socket", function() {
		for (var url in sockets) {
			if (sockets.hasOwnProperty(url)) {
				delete sockets[url];
			}
		}
	});
	
})(jQuery);