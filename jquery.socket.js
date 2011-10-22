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
		sockets = {};
	
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
		
		var // Socket object
			socket = {
				// Final options object
				options: $.extend(true, {}, options),
				// Transmits data using the connection
				send: function(data) {
					return socket.open(function(/* TODO remove -- just for tests */ send) {
						send(data);
					});
				},
				// Disconnects the connection
				close: function(code, reason) {
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
				if (old && !$.isFunction(fn)) {
					return old.apply(socket, arguments);
				}
				
				handler.add(fn);
				
				return socket;
			}
			
			socket[type] = $.extend(handler, $.Callbacks(flags));
		});
		
		// The url is a identifier of this socket within the document
		sockets[url] = socket;
		
		return socket;
	};

	$(window).bind("unload.socket", function() {
		for (var url in sockets) {
			if (sockets.hasOwnProperty(url)) {
				delete sockets[url];
			}
		}
	});
	
})(jQuery);