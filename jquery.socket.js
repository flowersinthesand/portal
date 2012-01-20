/*
 * jQuery Socket
 * http://github.com/flowersinthesand/jquery-socket
 * 
 * Copyright 2012, Donghwan Kim 
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
(function($, undefined) {
	
	var // Socket events
		socketEvents = ["connecting", "open", "message", "close", "waiting"],
		// Sockets
		sockets = {},
		// Default options
		defaults,
		// Transports
		transports,
		// Reference to core prototype
		hasOwn = Object.prototype.hasOwnProperty,
		// UUID
		uuid = $.now();
	
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
		
	// Socket is based on The WebSocket API
	function socket(url, options) {
		var // Transport
			transport,
			// Timeout
			timeoutTimer,
			// Heartbeat
			heartbeatTimer,
			// The state of the connection
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
				// Original URL
				url: function() {
					return url;
				},
				// Final options object
				options: $.extend(true, {}, defaults, options),
				// Gets or sets a connection scope value
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
					function proxy() {
						self.off(type, proxy);
						fn.apply(this, arguments);
					}
					
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
				notify: function(data, chunk) {
					if (chunk) {
						data = self.options.chunkParser.call(self, data);
						while (data.length) {
							self.notify(data.shift());
						}
						
						return this;
					}
					
					var events = isBinary(data) ? [{type: "message", data: data}] : $.makeArray(self.options.inbound.call(self, data)),
						i, event;
					
					for (i = 0; i < events.length; i++) {
						event = events[i];
						self.fire(event.type, [event.data]);
					}
					
					return this;
				},
				// Establishes a connection
				open: function() {
					var // From jQuery.ajax
						rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/, 
						id = self.options.id.call(self),
						candidates = $.makeArray(self.options.transport),
						query = {id: id, heartbeat: self.options.heartbeat || false},
						type, url, parts;
					
					// Cancels the scheduled connection
					if (reconnectTimer) {
						reconnectTimer = clearTimeout(reconnectTimer);
					}
					
					// Resets temporal object and event helpers
					temp = {};
					for (type in events) {
						events[type].reset();
					}
					
					// Chooses transport
					transport = undefined;
					self.data({id: id, candidates: candidates});
					
					while (candidates.length) {
						type = query.transport = candidates.shift();
						url = self.options.url.call(self, self.url(), query);
						parts = rurl.exec(url.toLowerCase());
						transport = transports[type] && transports[type](self.data({
							url: url,
							crossDomain: !!(parts && 
								// protocol and hostname
								(parts[1] != location.protocol || parts[2] != location.hostname ||
								// port
								(parts[3] || (parts[1] === "http:" ? 80 : 443)) != (location.port || (location.protocol === "http:" ? 80 : 443))))
						}));
						
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
				// Transmits event using the connection
				send: function(event, data) {
					if (state !== "opened") {
						buffer.push(arguments);
					} else if (transport) {
						if (data === undefined) {
							data = event;
							event = "message";
						}
						
						transport.send(transport.noOutbound || isBinary(data) ? 
							data : 
							self.options.outbound.call(self, {socket: self.data("id"), type: event, data: data}));
					}
					
					return this;
				},
				// Disconnects the connection
				close: function(reason) {
					// Prevents reconnection
					if (!reason) {
						self.options.reconnect = false;
						if (reconnectTimer) {
							reconnectTimer = clearTimeout(reconnectTimer);
						}
					}
					
					if (transport) {
						transport.close();
					}
					
					// Fires close event
					if (reason || !transport || !transport.hasCloseFeedback) {
						self.fire("close", [reason || "close"]);
					}
					
					return this;
				},
				// Finds a sub socket communicating with this socket
				find: function(name) {
					return $.socket(url + "/" + name, {transport: "sub", event: name, source: url});
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
		
		// Initializes
		self.connecting(function() {
			state = "connecting";
			
			// Increases the amount of reconnection attempts
			if (reconnectTry) {
				reconnectTry++;
			}
			
			// Sets timeout timer
			if (self.options.timeout > 0) {
				timeoutTimer = setTimeout(function() {
					self.close("timeout");
				}, self.options.timeout);
			}
		})
		.open(function() {
			// Helper function for setting heartbeat timer
			function setHeartbeatTimer() {
				heartbeatTimer = setTimeout(function() {
					self.send("heartbeat", null).one("heartbeat", function() {
						clearTimeout(heartbeatTimer);
						setHeartbeatTimer();
					});
					
					heartbeatTimer = setTimeout(function() {
						self.close("error");
					}, self.options._heartbeat);
				}, self.options.heartbeat - self.options._heartbeat);
			}
			
			state = "opened";
			
			// Clears timeout timer
			if (timeoutTimer) {
				timeoutTimer = clearTimeout(timeoutTimer);
			}
			
			// Sets heartbeat timer
			if (self.options.heartbeat > self.options._heartbeat) {
				setHeartbeatTimer();
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
		.close(function() {
			var type, event, order = events.close.order;
			
			state = "closed";
			
			// Clears timers
			if (timeoutTimer) {
				timeoutTimer = clearTimeout(timeoutTimer);
			}
			if (heartbeatTimer) {
				heartbeatTimer = clearTimeout(heartbeatTimer);
			}
			
			// Disables event whose order is lower than close event
			for (type in events) {
				event = events[type];
				if (event.order < order) {
					event.disable();
				}
			}
			
			// Handles reconnection
			if (self.options.reconnect) {
				self.one("close", function() {
					reconnectTry = reconnectTry || 1;
					reconnectDelay = self.options.reconnect.call(self, reconnectDelay || self.options._reconnect, reconnectTry);
					
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
	
	if (/android/.test(navigator.userAgent.toLowerCase())) {
		$.browser.android = true;
	}
	
	// Default options
	defaults = {
		transport: ["ws", "sse", "stream", "longpoll"],
		timeout: 5000,
		heartbeat: 20000,
		_heartbeat: 5000,
		reconnect: function(delay, attempts) {
			return attempts > 1 ? 2 * delay : 0;
		},
		_reconnect: 500,
		id: function() {
			// UUID logic from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
			return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0,
					v = c === "x" ? r : (r & 0x3 | 0x8);
				
			    return v.toString(16);
			});
		},
		url: function(url, query) {
			return url + (/\?/.test(url) ? "&" : "?") + $.param(query);
		},
		inbound: function(data) {
			return $.parseJSON(data);
		},
		outbound: function(event) {
			return $.stringifyJSON(event);
		},
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
				return url;
			}
		},
		chunkParser: function(chunk) {
			// Chunks are formatted according to the event stream format 
			// http://www.w3.org/TR/eventsource/#parsing-an-event-stream
			var reol = /\r\n|\r|\n/g, lines = [], data = this.data("data"), array = [], i = 0, 
				match, line;
			
			// String.prototype.split is not reliable cross-browser
			while (match = reol.exec(chunk)) {
			    lines.push(chunk.substring(i, match.index));
			    i = match.index + match[0].length;
			}
			lines.push(chunk.length === i ? "" : chunk.substring(i));
			
			if (!data) {
				data = [];
				this.data("data", data);
			}
			
			for (i = 0; i < lines.length; i++) {
				line = lines[i];
				if (!line) {
					array.push(data.join("\n"));
					data = [];
					this.data("data", data);
				} else if (/^data:\s/.test(line)) {
					data.push(line.substring("data: ".length));
				} else {
					data[data.length - 1] += line;
				}
			}
			
			return array;
		}
	};
	
	// Transports
	transports = {
		// Sub socket implementation
		sub: function(socket) {
			var event = socket.options.event,
				source = $.socket(socket.options.source);
			
			return {
				noOutbound: true,
				open: function() {
					socket.options.timeout = 0;
					socket.options.reconnect = false;
					
					if (!socket.options.init) {
						socket.options.init = true;
						
						source.open(function() {
							if (socket.state() === "closed") {
								socket.open();
							}
							
							socket.fire("open");
						})
						.close(function(reason) {
							socket.fire("close", [reason]);
						})
						.on(event, function(data) {
							socket.fire("message", [data]);
						});
					}
				},
				send: function(data) {
					source.send(event, data);
				},
				close: function() {
					socket.fire("close", ["close"]);
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
				hasCloseFeedback: true,
				open: function() {
					var url = decodeURI($('<a href="' + socket.data("url") + '"/>')[0].href.replace(/^http/, "ws"));
					
					socket.data("url", url);
					
					ws = new WebSocket(url);
					ws.onopen = function(event) {
						socket.data("event", event).fire("open");
					};
					ws.onmessage = function(event) {
						socket.data("event", event).notify(event.data);
					};
					ws.onerror = function(event) {
						socket.data("event", event).fire("close", ["error"]);
					};
					ws.onclose = function(event) {
						socket.data("event", event).fire.apply(socket, ["close", [event.wasClean ? "done" : aborted ? "close" : "error"]]);
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
		http: function(socket) {
			var send,
				sending,
				queue = [];
			
			function post() {
				if (queue.length) {
					send(socket.url(), queue.shift());
				} else {
					sending = false;
				}
			}
			
			send = !socket.data("crossDomain") || (socket.data("crossDomain") && $.support.cors) ? 
			function(url, data) {
				$.ajax(url, {type: "POST", data: "data=" + data, async: true, timeout: 0}).always(post);
			} : window.XDomainRequest && socket.options.xdrURL ? 
			function(url, data) {
				var xdr = new window.XDomainRequest();
				
				xdr.onload = post;
				xdr.open("POST", socket.options.xdrURL.call(socket, url));
				xdr.send("data=" + data);
			} : 
			function(url, data) {
				var $form = $("<form method='POST' enctype='text/plain' />"),
					$iframe = $("<iframe name='socket-" + (++uuid) + "'/>");
				
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
		// HTTP Streaming facade
		stream: function(socket) {
			socket.data("candidates").unshift("streamxdr", "streamiframe", "streamxhr");
		},
		// HTTP Streaming - XMLHttpRequest
		streamxhr: function(socket) {
			var XMLHttpRequest = window.XMLHttpRequest, 
				xhr, aborted;
			
			if (!XMLHttpRequest || window.XDomainRequest || window.ActiveXObject || 
					($.browser.android && $.browser.webkit) || (socket.data("crossDomain") && !$.support.cors)) {
				return;
			}
			
			return $.extend(transports.http(socket), {
				open: function() {
					var stop;
					
					xhr = new XMLHttpRequest();
					xhr.onreadystatechange = function() {
						function onprogress() {
							var index = socket.data("index"),
								length = xhr.responseText.length;
							
							if (!index) {
								socket.fire("open");
							} else if (length > index) {
								socket.notify(xhr.responseText.substring(index, length), true);
							}
							
							socket.data("index", length);
						}
						
						if (xhr.readyState === 3 && xhr.status === 200) {
							if ($.browser.opera && !stop) {
								stop = iterate(onprogress);
							} else {
								onprogress();
							}
						} else if (xhr.readyState === 4) {
							if (stop) {
								stop();
							}
							
							socket.fire.apply(socket, ["close", [xhr.status === 200 ? "done" : aborted ? "close" : "error"]]);
						}
					};
					
					xhr.open("GET", socket.data("url"));
					xhr.send(null);
				},
				close: function() {
					aborted = true;
					xhr.abort();
				}
			});
		},
		// HTTP Streaming - Iframe
		streamiframe: function(socket) {
			var ActiveXObject = window.ActiveXObject,
				doc, stop;
			
			if (!ActiveXObject || socket.data("crossDomain")) {
				return;
			}
			
			return $.extend(transports.http(socket), {
				open: function() {
					var iframe, cdoc;
					
					doc = new ActiveXObject("htmlfile");
					doc.open();
					doc.close();
					
					iframe = doc.createElement("iframe");
					iframe.src = socket.data("url");
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

							clone.appendChild(cdoc.createTextNode("."));
							text = clone.innerText;
							text = text.substring(0, text.length - 1);
							
							if (text) {
								response.innerText = "";
								socket.notify(text, true);
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
					if (stop) {
						stop();
					}
					
					doc.execCommand("Stop");
				}
			});
		},
		// HTTP Streaming - XDomainRequest
		streamxdr: function(socket) {
			var XDomainRequest = window.XDomainRequest,
				xdr;
			
			if (!XDomainRequest || !socket.options.xdrURL) {
				return;
			}
			
			return $.extend(transports.http(socket), {
				open: function() {
					var url = socket.options.xdrURL.call(socket, socket.data("url"));
					
					socket.data("url", url);
					
					xdr = new XDomainRequest();
					xdr.onprogress = function() {
						var index = socket.data("index"), 
							length = xdr.responseText.length;
						
						if (!index) {
							socket.fire("open");
						} else {
							socket.notify(xdr.responseText.substring(index, length), true);
						}
						
						socket.data("index", length);
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
		// Server-Sent Events
		sse: function(socket) {
			var EventSource = window.EventSource,
				es;
			
			if (!EventSource || socket.data("crossDomain")) {
				return;
			}
			
			return $.extend(transports.http(socket), {
				open: function() {
					es = new EventSource(socket.data("url"));
					es.onopen = function(event) {
						socket.data("event", event).fire("open");
					};
					es.onmessage = function(event) {
						socket.data("event", event).notify(event.data);
					};
					es.onerror = function(event) {
						es.close();
						
						// There is no way to find whether this connection closed normally or not 
						socket.data("event", event).fire("close", ["done"]);
					};
				},
				close: function() {
					es.close();
				}
			});
		},
		// Long Polling facade
		longpoll: function(socket) {
			socket.data("candidates").unshift("longpollxhr", "longpollxdr", "longpolljsonp");
		},
		// Long Polling - XMLHttpRequest
		longpollxhr: function(socket) {
			var count = 1, url = socket.data("url"),
				xhr;
			
			if (!$.support.ajax || (socket.data("crossDomain") && !$.support.cors)) {
				return;
			}
			
			url += (/\?/.test(url) ? "&" : "?") +  $.param({count: ""});
			
			function poll() {
				var u = url + count++;
				
				socket.data("url", u);
				
				xhr = $.ajax(u, {type: "GET", dataType: "text", async: true, cache: true, timeout: 0})
				.done(function(data) {
					if (data) {
						socket.notify(data);
						poll();
					} else {
						socket.fire("close", ["done"]);
					}
				})
				.fail(function(jqXHR, reason) {
					socket.fire("close", [reason === "abort" ? "close" : "error"]);
				});
			}
			
			return $.extend(transports.http(socket), {
				open: poll,
				close: function() {
					xhr.abort();
				}
			});
		},
		// Long Polling - XDomainRequest
		longpollxdr: function(socket) {
			var XDomainRequest = window.XDomainRequest, count = 1, url = socket.data("url"), 
				xdr;
			
			if (!XDomainRequest || !socket.options.xdrURL) {
				return;
			}
			
			url += (/\?/.test(url) ? "&" : "?") +  $.param({count: ""});
			
			function poll() {
				var u = socket.options.xdrURL.call(socket, url + count++);
				
				socket.data("url", u);
				
				xdr = new XDomainRequest();
				xdr.onload = function() {
					if (xdr.responseText) {
						socket.notify(xdr.responseText);
						poll();
					} else {
						socket.fire("close", ["done"]);
					}
				};
				xdr.onerror = function() {
					socket.fire("close", ["error"]);
				};
				
				xdr.open("GET", u);
				xdr.send();
			}
			
			return $.extend(transports.http(socket), {
				open: poll,
				close: function() {
					xdr.abort();
				}
			});
		},
		// Long Polling - JSONP
		longpolljsonp: function(socket) {
			var count = 1, url = socket.data("url"), callback = "socket_" + (++uuid),
				xhr, called;
			
			url += (/\?/.test(url) ? "&" : "?") +  $.param({callback: callback, count: ""});
			
			// Attaches callback
			window[callback] = function(data) {
				called = true;
				socket.notify(data);
			};
			socket.one("close", function() {
				window[callback] = undefined;
			});
			
			function poll() {
				var u = url + count++;
				
				socket.data("url", u);
				
				xhr = $.ajax(u, {dataType: "script", crossDomain: true, cache: true, timeout: 0})
				.done(function() {
					if (called) {
						called = false;
						poll();
					} else {
						socket.fire("close", ["done"]);
					}
				})
				.fail(function(jqXHR, reason) {
					socket.fire("close", [reason === "abort" ? "close" : "error"]);
				});
			}
			
			return $.extend(transports.http(socket), {
				open: poll,
				close: function() {
					xhr.abort();
				}
			});
		}
	};
	
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