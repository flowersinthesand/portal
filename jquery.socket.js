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
		if (sockets.hasOwnProperty(url) && !options) {
			return sockets[url];
		}
		
		// Socket object
		var socket = {};
		
		// The url is a identifier of this socket within the document
		sockets[url] = socket;
		
		return socket;
	};

	$(window).bind("unload.socket", function() {
		for (var url in sockets) {
			delete sockets[url];
		}
	});
	
})(jQuery);