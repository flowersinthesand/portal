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
								socket._fire(isBinary(data) ? data : $.stringifyJSON({
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