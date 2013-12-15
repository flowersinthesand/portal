(function(root, factory) {
	if (typeof define === "function" && define.amd) {
		// AMD
		define(factory);
	} else if (typeof exports === "object") {
		// Node
		module.exports = factory();
	} else {
		// Browser globals, Window
		root.helper = factory();
	}
}(this, function() {
	// Configure QUnit
	QUnit.config.testTimeout = 10000;
	
	var helper = {
			setup: function() {
				helper.original = helper.extend(true, {}, portal)
				portal.defaults.sharing = false;
			},
			teardown: function() {
				portal.finalize();
				
				var i, j;
				
				for (i in {defaults: 1, transports: 1}) {
					for (j in portal[i]) {
						delete portal[i][j];
					}
					
					helper.extend(true, portal[i], helper.original[i]);
				}
			},
			extend: function() {
				var module = {};
	
				// From https://raw.github.com/justmoon/node-extend/v1.2.1/index.js
				(function(module) {
					var hasOwn = Object.prototype.hasOwnProperty;
					var toString = Object.prototype.toString;
	
					function isPlainObject(obj) {
						if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
							return false;
	
						var has_own_constructor = hasOwn.call(obj, 'constructor');
						var has_is_property_of_method = hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
						// Not own constructor property must be Object
						if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
							return false;
	
						// Own properties are enumerated firstly, so to speed up,
						// if last one is own, then all properties are own.
						var key;
						for ( key in obj ) {}
	
						return key === undefined || hasOwn.call( obj, key );
					};
	
					module.exports = function extend() {
						var options, name, src, copy, copyIsArray, clone,
						    target = arguments[0] || {},
						    i = 1,
						    length = arguments.length,
						    deep = false;
	
						// Handle a deep copy situation
						if ( typeof target === "boolean" ) {
							deep = target;
							target = arguments[1] || {};
							// skip the boolean and the target
							i = 2;
						}
	
						// Handle case when target is a string or something (possible in deep copy)
						if ( typeof target !== "object" && typeof target !== "function") {
							target = {};
						}
	
						for ( ; i < length; i++ ) {
							// Only deal with non-null/undefined values
							if ( (options = arguments[ i ]) != null ) {
								// Extend the base object
								for ( name in options ) {
									src = target[ name ];
									copy = options[ name ];
	
									// Prevent never-ending loop
									if ( target === copy ) {
										continue;
									}
	
									// Recurse if we're merging plain objects or arrays
									// Replaced Array.isArray with Object.prototype.toString
									if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = toString.call(copy) === "[object Array]") ) ) {
										if ( copyIsArray ) {
											copyIsArray = false;
											clone = src && Array.isArray(src) ? src : [];
	
										} else {
											clone = src && isPlainObject(src) ? src : {};
										}
	
										// Never move original objects, clone them
										target[ name ] = extend( deep, clone, copy );
	
									// Don't bring in undefined values
									} else if ( copy !== undefined ) {
										target[ name ] = copy;
									}
								}
							}
						}
	
						// Return the modified object
						return target;
					};
				})(module);
				
				return module.exports.apply(this, arguments);
			},
			// From jQuery 1.8.3
			each: function( obj, callback, args ) {
				var name,
					i = 0,
					length = obj.length,
					// Replaced jQuery.isFunction with Object.prototype.toString
					isObj = length === undefined || Object.prototype.toString.call( obj ) === "[object Function]";
		
				if ( args ) {
					if ( isObj ) {
						for ( name in obj ) {
							if ( callback.apply( obj[ name ], args ) === false ) {
								break;
							}
						}
					} else {
						for ( ; i < length; ) {
							if ( callback.apply( obj[ i++ ], args ) === false ) {
								break;
							}
						}
					}
		
				// A special, fast, case for the most common use of each
				} else {
					if ( isObj ) {
						for ( name in obj ) {
							if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
								break;
							}
						}
					} else {
						for ( ; i < length; ) {
							if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
								break;
							}
						}
					}
				}
		
				return obj;
			},
			okTrue: function() {
				ok(true);
			},
			okFalse: function() {
				ok(false);
			}
		};

	return helper;
}));