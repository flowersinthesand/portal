var // Socket repository
	sockets = {},
	// Event handlers
	actions = {
		// Called when a HTTP request and response is prepared
		http: function(req, res) {
			switch (req.method) {
			// GET is used to establish and manage HTTP transport
			case "GET":
				req.params = url.parse(req.url, true).query;
				
				// Set no-cache headers for old browsers
				helper.nocache(req, res);
				// Set cors headers to enable streamxdr and longpollxdr or allow cross-origin request 
				helper.cors(req, res);
				switch (req.params.when) {
				// Establish HTTP transport
				case "open":
					switch (req.params.transport) {
					// The server-sent events, sse, is yet another streaming technique
					case "sse":
					case "streamxhr":
					case "streamxdr":
					case "streamiframe":
						actions.socket(socket(req.params, transports.stream(req, res)));
						break;
					case "longpollajax":
					case "longpollxdr":
					case "longpolljsonp":
						actions.socket(socket(req.params, transports.longpoll(req, res)));
						break;
					default:
						throw new Error("The transport [" + req.params.transport + "] is not supported");
					}
					break;
				// Inject new request and response to long polling transport
				case "poll":
					// In case of longpolljsonp in certain browsers, it polls again after a few minutes of close for some reason
					// so check if there is socket first but not sure why it's so
					if (req.params.id in sockets) {
						sockets[req.params.id].transport.refresh(req, res);
					}
					break;
				// Detect disconnection
				case "abort":
					// According to client and server, socket may be deleted already by its close event
					if (req.params.id in sockets) {
						sockets[req.params.id].close();
					}
					break;
				default:
					throw new Error("The when [" + req.params.when + "] is not supported");
				}
				break;
			// POST is used to emit HTTP transport's message event
			case "POST":
				// Set no-cache headers for old browsers
				helper.nocache(req, res);
				// Set cors headers to enable streamxdr and longpollxdr or allow cross-origin request 
				helper.cors(req, res);
				
				// Note that request's content type is text/plain not application/x-www-form-urlencoded
				// so need to read body
				var body = "";
				req.on("data", function(chunk) {
					body += chunk;
				});
				req.on("end", function() {
					// Take text after 'data='
					var text = /^data=(.+)/.exec(body)[1],
						id = /"socket":"([^\"]+)"/.exec(text)[1];
					
					// Emit message event to transport
					sockets[id].transport.emit("message", text);
					// Close response
					res.end();
				});
				break;
			default:
				throw new Error("The method [" + req.method + "] is not supported");
			}
		},
		// Called when a opened WebSocket is prepared
		ws: function(req, ws) {
			// There is nothing you have to do
			actions.socket(socket(url.parse(req.url, true).query, transports.ws(ws)));
		},
		// Called when a portal socket is prepared
		// this is the event for the portal application developer
		socket: function(socket) {
			socket.on("echo", function(data) {
				this.send("echo", data);
			})
			.on("closebyserver", function() {
				var self = this;
				setTimeout(function() {
					self.close();
				}, 100);
			});
		}
	},
	// Transport provides an unified view of frame-based connection
	// It is an EventEmitter and handles message and close event
	transports = {
		// WebSocket
		// ws: WebSocket
		ws: function(ws) {
			var transport = new events.EventEmitter();
			
			ws.onclose = function() {
				transport.emit("close");
			};
			ws.onmessage = function(event) {
				transport.emit("message", event.data);
			};
			
			transport.send = function(data) {
				ws.send(data);
			};
			transport.close = function() {
				ws.close();
			};
			
			return transport;
		},
		// HTTP Streaming
		// sse: Server-Sent Events
		// streamxhr: XMLHttpRequest streaming
		// streamxdr: XDomainRequest streaming
		// streamiframe: Hidden Iframe streaming
		stream: function(req, res) {
			var isAndroidLowerThan3 = /Android [23]./.test(req.headers["user-agent"]),
				transport = new events.EventEmitter();
			
			// The content-type headers should be 'text/event-stream' for sse and 'text/plain' for others
			// in fact 'text/plain' is required by streamiframe to prevent iframe tag from parsing response as HTML
			res.setHeader("content-type", "text/" + (req.params.transport === "sse" ? "event-stream" : "plain") + "; charset=utf-8");
			
			// Applies to: sse
			// The response should be encoded in utf-8 format
			// utf8 is default encoding in Node.js
			
			// Applies to: streamxdr
			// Access-Control-Allow-Origin header should be either * or the value of the Origin request header
			// it is done in actions.http.GET:
			
			// Applies to: streamxdr, streamiframe, streamxhr in Android browser lower than 3 
			// The padding is required, which makes the transport object in the browser side aware of change of the response.
			// it should be greater than one kilobyte (4KB for Android browser lower than 3), 
			// be composed of white space characters and end with \r, \n or \r\n
			// The client socket fires the open event when noticing padding
			res.write((isAndroidLowerThan3 ? helper.text4KB : helper.text2KB) + "\n");
			
			// This callback will be executed when either client or server closes transport
			function onclose() {
				transport.emit("close");
			}
			res.on("close", onclose);
			res.on("finish", onclose);
			
			transport.send = function(data) {
				// The response text should be formatted in the event stream format
				// http://dev.w3.org/html5/eventsource/#parsing-an-event-stream
				// This is a requirement of sse, but the rest also accept that format for convenience 
				var payload =
					// Android browser lower than 3 need 4KB padding at the top of each event
					(isAndroidLowerThan3 ? helper.text4KB : "") +
					// Break data up by \r, \n, or \r\n, append 'data: ' to the beginning of each line 
					data.split(/\r\n|[\r\n]/).map(function(chunk) {
						return "data: " + chunk + "\n";
					})
					.join("") +
					// Print \n to mark the end of a single data
					"\n";
				
				res.write(payload);
			};
			transport.close = function() {
				res.end();
			};
			
			return transport;
		},
		// HTTP Long polling
		// longpollajax: AJAX long polling
		// longpollxdr: XDomainRequest long polling
		// longpolljsonp: JSONP long polling
		longpoll: function(req, res) {
			var // Current response 
				response,
				// Whether the current response has ended or not
				ended,
				// Whether data is written on the current response or not
				// if this is true, then 'ended' must be true, but not vice versa
				written,
				// Close timer set in the interval between poll
				closeTimer,
				// Parameters of open request not poll
				params = req.params,
				// Buffer for client not to lose data
				buffer = [],
				transport = new events.EventEmitter();
			
			// Expose the refresh method to re-use by actions.http.GET.poll
			transport.refresh = function(req, res) {
				// The content-type header should be 'text/javascript' for longpolljsonp and 'text/plain' for the others
				// Note that the first request params is used to check
				res.setHeader("content-type", "text/" + (params.transport === "longpolljsonp" ? "javascript" : "plain") + "; charset=utf-8");

				// Applies to: longpollxdr
				// Access-Control-Allow-Origin header should be either * or the value of the Origin request header
				// it is done in actions.http.GET:

				// This callback will be executed when either client or server closes transport
				function onclose() {
					// The current response's life ends
					ended = true;
					
					// If the server didn't write anything, completion of this request should be regarded as the end of a connection. 
					// So, the client socket fires the close event if the response is empty and poll if not.
					if (req.params.when === "poll" && !written) {
						transport.emit("close");
					}

					// Set a timer to fire close event between polls
					// If the client disconnects connection during dispatching event,
					// this connection will remain in limbo without the timer
					closeTimer = setTimeout(function() {
						transport.emit("close");
					}, 500);
				}
				res.on("finish", onclose);
				res.on("close", onclose);
				
				// The first request's when parameter is 'open' and that of others is 'poll'
				if (req.params.when === "open") {
					// The request should be completed immediately
					// The purpose of this is to tell the browser that the server is alive. 
					// The client socket fires the open event when the first request completes normally.
					res.end();
				} else {
					// Rest the response, flags, close timer as new request starts
					response = res;
					ended = written = false;
					clearTimeout(closeTimer);
					
					// Remove client-received events from buffer
					// Event id the client received is attached to lastEventIds parameter in the form of CSV
					if (req.params.lastEventIds) {
						req.params.lastEventIds.split(",").forEach(function(eventId) {
							buffer.forEach(function(message) {
								if (eventId === /"id":"([^\"]+)"/.exec(message)[1]) {
									// Same with buffer.remove(message)
									buffer.splice(buffer.indexOf(message), 1);
								}
							});
						});
					}
					
					// If there is data in buffer, flushes them in the form of JSON array
					if (buffer.length) {
						// Note that this is not same with JSON.stringify(buffer)
						// since elements in buffer are already JSON string
						transport.send("[" + buffer.join(",") + "]");
					}
				}
			};
			// Refresh with the first request and response
			transport.refresh(req, res);
			
			transport.send = function(data) {
				// Cache data if it's not from buffer 
				if (!/^\[/.test(data)) {
					buffer.push(data);
				}
				
				// Only when the current response is not ended, it's possible to send
				// If the current response is ended, the data will be sent in flushing buffer in next poll 
				if (!ended) {
					// Flag the current response ends with data
					// ended will be true after response.end(payload)
					written = true;
					
					var payload = 
						// In case of longpolljsonp, the response text is a JavaScript code snippet executing a given 
						// callback in the client with data. The callback name is passed as the first request' callback parameter 
						// and the data should be escaped to a JavaScript string literal
						// Note that the first request's params is used
						params.transport === "longpolljsonp" ? params.callback + "(" + JSON.stringify(data) + ");" : 
						// For others, no formatting is needed
						data;

					// All the long polling transports has to finish the request after processing
					response.end(payload);
				}
			};
			transport.close = function() {
				// End response if possible
				if (!ended) {
					response.end();
				}
			};
			
			return transport;
		}
	},
	// Socket provides an unified view of event-based connection for the portal application developer 
	// It is a counterpart of socket from portal.js though there is API difference
	socket = function(params, transport) {
		var socket = new events.EventEmitter();
		
		// Only for actions.http.GET.poll and actions.http.POST
		socket.transport = transport;
		
		// If the underlying transport is closed
		transport.on("close", function() {
			// delete the socket from the repository
			delete sockets[params.id];
			// fires the close event to the socket
			socket.emit("close");
		});
		// If the underlying transport receives a message
		transport.on("message", function(data) {
			// Convert JSON string into event object
			var event = JSON.parse(data);
			// And fires it
			socket.emit(event.type, event.data);
		});
		
		socket.send = function(type, data) {
			// Convert event object to JSON string
			transport.send(JSON.stringify({id: uuid.v4(), type: type, data: data}));
		};
		socket.close = function() {
			transport.close();
		};
		
		// Register the socket to the repository
		sockets[params.id] = socket;
		
		return socket;
	},
	// Helper 
	helper = (function() {
		var helper = {
				nocache: function(req, res) {
					// Precautions for old browsers
					res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
					res.setHeader("pragma", "no-cache");
					res.setHeader("expires", "0");
				},
				cors: function(req, res) {
					// Applies to streamxdr and longpollxdr
					// Access-Control-Allow-Origin header should be either * or the value of the Origin request header
					// Note that these transport need this header even in same-origin connection 
					res.setHeader("access-control-allow-origin", req.headers["origin"] || "*");
					
					// Do if you want 
					res.setHeader("access-control-allow-credentials", "true");
					if (req.headers["access-control-request-headers"]) {
						res.setHeader("access-control-allow-headers", req.headers["access-control-request-headers"]);
					}
				}
			},
			i, text = " ";
		
		for (i = 0; i < 2048; i++) {
			text += " ";
		}
		
		helper.text2KB = text;
		helper.text4KB = text + text;
		
		return helper;
	})();

// About Node.js
var url = require("url"),
	send = require("send"),
	events = require("events"),
	uuid = require("node-uuid"),
	httpServer = require("http").createServer(),
	wsFactory = new (require("ws").Server)({noServer: true});

// req.url, /test, is portal connection
httpServer.on("request", function(req, res) {
	if (/\/test/.test(req.url)) {
		actions.http(req, res);
	} else {
		// Serves static resources
		var root = __dirname + (/\/portal.js/.test(req.url) ? "/.." : "/webapp");
		send(req, url.parse(req.url).pathname).root(root).pipe(res);
	}
})
.on("upgrade", function(req, socket, head) {
	if (/\/test/.test(req.url)) {
		wsFactory.handleUpgrade(req, socket, head, function(ws) {
			actions.ws(req, ws);
		});
	}
})
.listen(8080);