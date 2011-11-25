(function($) {
	// The server-side view of the socket handling
	$.socket.transports.test = function(socket) {
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
								fn.apply(connection, Array.prototype.slice.call(arguments, 1));
							});
							return this;
						}
					},
					// Request object for the server
					request = {
						url: socket.options.url,
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
	};
})(jQuery);
