(function($) {
	
	function isBinary(data) {
		var string = Object.prototype.toString.call(data);
		return string === "[object Blob]" || string === "[object ArrayBuffer]";
	}
	
	function param(url, name) {
		var match = new RegExp("[?&]" + name + "=([^&]+)").exec(url);
		return match ? decodeURIComponent(match[1]) : null;
	}
	
	// The server-side view of the socket handling
	$.socket.transports.test = function(socket, options) {
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
								heartbeat = param(socket.session("url"), "heartbeat");
								if (heartbeat > 0) {
									heartbeatTimer = setTimeout(function() {
										socket.fire("close", ["error"]);
									}, heartbeat);
								}
							})
							.on("heartbeat", function() {
								if (heartbeatTimer) {
									clearTimeout(heartbeatTimer);
									heartbeatTimer = setTimeout(function() {
										socket.fire("close", ["error"]);
									}, heartbeat);
									connection.send("heartbeat", null);
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
								if (data === undefined || $.isFunction(data)) {
									callback = data;
									data = event;
									event = "message";
								}
								
								eventId++;
								callbacks[eventId] = callback;
								socket._notify(isBinary(data) ? data : $.stringifyJSON({id: eventId, reply: !!callback, type: event, data: data}));
							}
						}, 5);
						return this;
					},
					close: function() {
						setTimeout(function() {
							if (accepted) {
								socket.fire("close", ["done"]);
								connection.event.triggerHandler("close");
							}
						}, 5);
						return this;
					},
					on: function(type, fn) {
						connection.event.on(type, function() {
							var result = fn.apply(connection, Array.prototype.slice.call(arguments, 1));
							if (result !== undefined) {
								connection.reply = result;
							}
						});
						return this;
					},
					reply: null
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
						socket.fire("close", ["error"]);
						break;
					}
				}, 5);
			},
			send: function(data) {
				setTimeout(function() {
					if (accepted) {
						var event = isBinary(data) ? {type: "message", data: data} : $.parseJSON(data);
						connection.event.triggerHandler(event.type, [event.data]);
						
						if (event.reply) {
							connection.send("reply", {id: event.id, data: connection.reply});
							connection.reply = null;
						}
					}
				}, 5);
			},
			close: function() {
				setTimeout(function() {
					socket.fire("close", ["close"]);
					if (accepted) {
						connection.event.triggerHandler("close");
					}
				}, 5);
			}
		};
	};
})(jQuery);