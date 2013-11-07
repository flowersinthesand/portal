// Dummy transport
portal.transports.dummy = function() {
	return {
		open: function() {},
		send: function() {},
		close: function() {}
	};
};

// The server-side view of the socket handling
// when using this, the user must use the server.fire and not use the client.fire
portal.transports.mock = function(client, options) {
	var server;
	
	// Hack for the server-side socket's transport
	if (options.client) {
		server = client;
		client = options.client;
		
		// The server does
		return {
			open: function() {},
			send: function(data) {
				if (client.state() === "opened") {
					client._fire(data);
				}
			},
			close: function() {
				server.fire("close", "aborted");
			}
		};
	}
	
	// The client does 
	return {
		feedback: true,
		open: function() {
			// Forwards control to the user
			client.server = function(opts) {
				if (server) {
					return server;
				}
				
				// A server-side socket
				opts = opts || {};
				server = portal.open("/server~" + client.option("url"), {
					reconnect: false,
					sharing: false,
					transports: ["mock"],
					client: client
				});
				
				return server.on({
					open: function() {
						client.fire("open");
					},
					close: function(reason) {
						// Safe though this is done by the client
						client.fire("close", reason);
					},
					// Incomplete implementation but fine
					heartbeat: function() {
						if (!opts.noHeartbeat) {
							// Only heartbeat event should be sent with some delay
							setTimeout(function() {
								server.send("heartbeat");
							}, 1);
						}
					}
				});
			};
		},
		send: function(data) {
			if (server && server.state() === "opened") {
				server._fire(data);
			}
		},
		close: function() {
			if (server) {
				server.fire("close", "aborted");
			}
		}
	};
};