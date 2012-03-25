package org.flowersinthesand.jquerysocket.atmosphere;

import java.io.IOException;
import java.io.PrintWriter;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import javax.servlet.http.HttpServletRequest;

import org.atmosphere.cpr.AtmosphereConfig;
import org.atmosphere.cpr.AtmosphereHandler;
import org.atmosphere.cpr.AtmosphereRequest;
import org.atmosphere.cpr.AtmosphereResource;
import org.atmosphere.cpr.AtmosphereResourceEvent;
import org.atmosphere.cpr.AtmosphereResourceEventListener;
import org.atmosphere.cpr.AtmosphereResponse;
import org.flowersinthesand.jquerysocket.Connection;
import org.flowersinthesand.jquerysocket.EventHandler;
import org.flowersinthesand.jquerysocket.On;
import org.reflections.Reflections;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

public class DispatcherAtmosphereHandler implements AtmosphereHandler {
	
	// A map of connection identifiers and objects
	private Map<String, Connection> connections = new ConcurrentHashMap<String, Connection>();
	// A map of callback identifiers and objects
	private Map<String, Connection.Callback<?>> callbacks = new ConcurrentHashMap<String, Connection.Callback<?>>();
	
	private class AtmosphereConnection implements Connection {

		List<Map<String, Object>> buffer = new CopyOnWriteArrayList<Map<String, Object>>();
		Map<String, Object> data = new ConcurrentHashMap<String, Object>();
		AtomicInteger eventId = new AtomicInteger(0);
		AtmosphereResource resource;
		Timer heartbeatTimer;
		
		void setData(HttpServletRequest request) {
			data.put("request", request);
			data.put("parameters", request.getParameterMap());
			data.put("id", request.getParameter("id"));
			data.put("transport", request.getParameter("transport"));
			data.put("heartbeat", request.getParameter("heartbeat"));
		}

		void setHeartbeat() {
			// Cancels if scheduled
			if (heartbeatTimer != null) {
				heartbeatTimer.cancel();
			}
			// Schedules the close
			heartbeatTimer = new Timer();
			heartbeatTimer.schedule(new TimerTask() {
				@Override
				public void run() {
					close();
				}
			}, (Long) data.get("heartbeat"));
		}

		@Override
		public Map<String, Object> data() {
			return data;
		}

		@Override
		public void send(Object data) {
			doSend("message", data, null);
		}

		@Override
		public void send(String event, Object data) {
			doSend(event, data, null);
		}
		
		@Override
		public void sendWithCallback(Object data, Callback<?> callback) {
			doSend("message", data, callback);
		}
		
		@Override
		public void sendWithCallback(String event, Object data, Callback<?> callback) {
			doSend(event, data, callback);
		}
		
		void doSend(String event, Object datum, Callback<?> callback) {
			// eventId++
			eventId.incrementAndGet();
			// Puts a callback with a id made of connection id and event id
			if (callback != null) {
				callbacks.put(data.get("id") + ":" + eventId, callback);
			}
			
			Map<String, Object> map = new LinkedHashMap<String, Object>();
			map.put("id", eventId.get());
			map.put("reply", callback != null);
			map.put("type", event);
			map.put("data", datum);

			transmit(new Gson().toJson(map));
		}

		private void transmit(String data) {
			resource.getBroadcaster().broadcast(data, resource);
		}

		@Override
		public void close() {
			resource.resume();
		}
	
	}

	@Override
	public void onRequest(AtmosphereResource resource) throws IOException {
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();

		if (request.getMethod().equalsIgnoreCase("GET")) {
			String transport = request.getParameter("transport");
			if (transport.equals("ws")) {
				doWebSocketConnect(resource, request, response, transport);
			} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
				doStreamConnect(resource, request, response, transport);
			} else if (transport.equals("longpollajax") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
				doLongPollConnect(resource, request, response, transport);
			}
		} else if (request.getMethod().equalsIgnoreCase("POST")) {
			// Some Internet Explorer sends wrong encoded data for some reason
			request.setCharacterEncoding("utf-8");
			// Because the Content-Type is not application/x-www-form-urlencoded but text/plain on account of XDomainRequest,
			// You should use the POST request's message body to retrieve a message instead of request.getParameter method 
			// See the fourth at http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
			String data = request.getReader().readLine();
			if (data != null) {
				// data through a WebSocket connection does not start with 'data='
				if (data.startsWith("data=")) {
					data = data.substring("data=".length());
				}
				
				// By default, message is a JSON string representing an event
				Map<String, Object> event = new Gson().fromJson(data, new TypeToken<Map<String, Object>>() {}.getType());
				fire(event);
			}
			// CORS
			response.setHeader("Access-Control-Allow-Origin", "*");
		}
	}

	private void doWebSocketConnect(AtmosphereResource resource, AtmosphereRequest request, AtmosphereResponse response, String transport) throws IOException {
		final String id = request.getParameter("id");
		final AtmosphereConnection c = new AtmosphereConnection();			
		c.setData(request);
		c.resource = resource;
		
		// If the heartbeat is in number format, suspends the current resource indefinitely
		long timeout = 20000;
		try {
			c.data.put("heartbeat", new Long(request.getParameter("heartbeat")));
			timeout = -1;
		} catch (NumberFormatException e) {}
		
		// When the connection ends, fires the close event
		resource.addEventListener(new AtmosphereResourceEventListener() {
			@Override
			public void onSuspend(AtmosphereResourceEvent event) {
				// Fires the open event
				connections.put(id, c);
				fire(id, "open");
			}

			@Override
			public void onBroadcast(AtmosphereResourceEvent event) {
				
			}

			@Override
			public void onThrowable(AtmosphereResourceEvent event) {
				cleanup();
			}

			@Override
			public void onResume(AtmosphereResourceEvent event) {
				cleanup();
			}

			@Override
			public void onDisconnect(AtmosphereResourceEvent event) {
				cleanup();
			}

			private void cleanup() {
				fire(id, "close");
			}
		});
		resource.suspend(timeout, false);
	}

	private void doStreamConnect(AtmosphereResource resource, AtmosphereRequest request, AtmosphereResponse response, String transport) throws IOException {
		// sse requires the response to be encoded as 'UTF-8'
		// http://dev.w3.org/html5/eventsource/#parsing-an-event-stream
		response.setCharacterEncoding("utf-8");
		// streamxdr requires 'Access-Control-Allow-Origin' header to be set to '*'
		// http://msdn.microsoft.com/en-us/library/cc288060%28v=VS.85%29.aspx
		response.setHeader("Access-Control-Allow-Origin", "*");
		// sse requires the content type to be 'text/event-stream'
		// http://dev.w3.org/html5/eventsource/#parsing-an-event-stream
		// streamiframe requires the content type to be 'text/plain'
		response.setContentType("text/" + (transport.equals("sse") ? "event-stream" : "plain"));
		// sse requires padding of white space ending with \n
		// streamxdr, streamiframe and streamxhr in Webkit require padding of any character
		PrintWriter writer = response.getWriter();
		writer.print(Arrays.toString(new float[400]).replaceAll(".", " "));
		writer.print("\n");
		writer.flush();

		final String id = request.getParameter("id");
		final AtmosphereConnection c = new AtmosphereConnection();			
		c.setData(request);
		c.resource = resource;
		
		// If the heartbeat is in number format, suspends the current resource indefinitely
		long timeout = 20000;
		try {
			c.data.put("heartbeat", new Long(request.getParameter("heartbeat")));
			timeout = -1;
		} catch (NumberFormatException e) {}
		
		// When the connection ends, fires the close event
		resource.addEventListener(new AtmosphereResourceEventListener() {
			@Override
			public void onSuspend(AtmosphereResourceEvent event) {
				// Fires the open event
				connections.put(id, c);
				fire(id, "open");
			}

			@Override
			public void onBroadcast(AtmosphereResourceEvent event) {
				
			}

			@Override
			public void onThrowable(AtmosphereResourceEvent event) {
				cleanup();
			}

			@Override
			public void onResume(AtmosphereResourceEvent event) {
				cleanup();
			}

			@Override
			public void onDisconnect(AtmosphereResourceEvent event) {
				cleanup();
			}

			private void cleanup() {
				fire(id, "close");
			}
		});
		resource.suspend(timeout, false);
	}

	private void doLongPollConnect(AtmosphereResource resource, AtmosphereRequest request, AtmosphereResponse response, String transport) throws IOException {
		// According to convention
		response.setCharacterEncoding("utf-8");
		// longpollxdr requires 'Access-Control-Allow-Origin' header to be set to '*'
		// http://msdn.microsoft.com/en-us/library/cc288060%28v=VS.85%29.aspx
		response.setHeader("Access-Control-Allow-Origin", "*");
		// longpolljsonp requires the content type to be 'text/javascript'
		response.setContentType("text/" + (transport.equals("longpolljsonp") ? "javascript" : "plain"));

		final String id = request.getParameter("id");
		final String count = request.getParameter("count");
		final AtmosphereConnection c = connections.containsKey(id) ? (AtmosphereConnection) connections.get(id) : new AtmosphereConnection();
		c.setData(request);
		c.resource = resource;
		
		// If the heartbeat is in number format, suspends the current resource indefinitely
		long timeout = 20000;
		try {
			c.data.put("heartbeat", new Long(request.getParameter("heartbeat")));
			timeout = -1;
		} catch (NumberFormatException e) {}

		// When the connection ends, fires the close event
		resource.addEventListener(new AtmosphereResourceEventListener() {
			@Override
			public void onSuspend(AtmosphereResourceEvent event) {
				// If this request is first request
				if ("1".equals(count)) {
					// To tell the client that the server accepts the request, sends an empty string
					c.send(" ");
					// Fires the open event
					connections.put(id, c);
					fire(id, "open");
				// If the connection's buffer is not empty, flushes them
				} else if (!c.buffer.isEmpty()) {
					c.transmit(new Gson().toJson(c.buffer));
					c.buffer.clear();
				}
			}

			@Override
			public void onBroadcast(AtmosphereResourceEvent event) {
				
			}

			@Override
			public void onThrowable(AtmosphereResourceEvent event) {
				cleanup(event);
			}

			@Override
			public void onResume(AtmosphereResourceEvent event) {
				cleanup(event);
			}

			@Override
			public void onDisconnect(AtmosphereResourceEvent event) {
				cleanup(event);
			}

			private void cleanup(AtmosphereResourceEvent event) {
				// The completion of the request with no response means the end of the connection
				if (!event.getResource().getResponse().isCommitted()) {
					fire(id, "close");
				}
			}
		});
		resource.suspend(timeout, false);
	}

	@Override
	@SuppressWarnings("unchecked")
	public void onStateChange(AtmosphereResourceEvent event) throws IOException {
		AtmosphereResource resource = event.getResource();
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();
		PrintWriter writer = response.getWriter();
		String transport = request.getParameter("transport");
		String data = (String) event.getMessage();

		if (transport.equals("ws")) {
			writer.print(data);
			writer.flush();
		} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			// streamxdr, streamiframe, streamxhr and sse require a message to be formatted according to event stream format
			// http://www.w3.org/TR/eventsource/#event-stream-interpretation
			for (String datum : data.split("\r\n|\r|\n")) {
				writer.print("data: ");
				writer.print(datum);
				writer.print("\n");
			}

			writer.print("\n");
			writer.flush();
		} else if (transport.equals("longpollajax") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			if (!event.isCancelled() && !request.destroybed()) {
				String jsonp = request.getParameter("callback");

				if (jsonp == null) {
					writer.print(data);
				} else {
					// data should be escaped to compose a normally executable JavaScript code 
					writer.print(jsonp);
					writer.print("(");
					writer.print(new Gson().toJson(data));
					writer.print(")");
				}

				writer.flush();
				// Completes the connection
				resource.resume();
			} else {
				// If the real connection is not available, accumulates it to the buffer
				((AtmosphereConnection) connections.get(request.getParameter("id"))).buffer.add(new Gson().fromJson(data, Map.class));
			}
		}
	}

	@Override
	public void destroy() {

	}

	private void fire(String id, String type) {
		Map<String, Object> event = new LinkedHashMap<String, Object>();
	
		event.put("socket", id);
		event.put("type", type);
	
		fire(event);
	}

	@SuppressWarnings("unchecked")
	private void fire(Map<String, Object> event) {
		String id = (String) event.get("socket");
		if (!connections.containsKey(id)) {
			return;
		}
		
		AtmosphereConnection c = (AtmosphereConnection) connections.get(id);
		String type = (String) event.get("type");
		Object data = event.get("data");
	
		if (type.equals("open")) {
			// If the heartbeat is in number format, sets a heartbeat timer
			if (c.data.get("heartbeat") instanceof Long) {
				c.setHeartbeat();
			}
		} else if (type.equals("close")) {
			// Cancels the heartbeat timer and callbacks related to the connection
			if (c.heartbeatTimer != null) {
				c.heartbeatTimer.cancel();
			}
			for (String callbackKey : callbacks.keySet()) {
				if (callbackKey.startsWith(id)) {
					callbacks.remove(callbackKey);
				}
			}
		} else if (type.equals("heartbeat")) {
			if (c.heartbeatTimer != null) {
				// Resets the heartbeat timer
				c.setHeartbeat();
				// Tells the client that the connection is working by sending a heartbeat event
				c.send("heartbeat", null);
			}
		} else if (type.equals("reply")) {
			// Executes a callback
			Map<String, Object> replyData = (Map<String, Object>) data;
			String callbackKey = id + "." + replyData.get("id");
			
			if (callbacks.containsKey(callbackKey)) {
				((Connection.Callback<Object>) callbacks.get(callbackKey)).execute(replyData.get("data"));
				callbacks.remove(callbackKey);
			}
		}
		
		// This value may be used as a reply data
		Object reply = handle(id, type, data);

		if (type.equals("close")) {
			// Removes the completed connection
			connections.remove(id);
		} else if (event.containsKey("reply") && (Boolean) event.get("reply")) {
			// Sends a reply event with the above data
			Map<String, Object> replyData = new LinkedHashMap<String, Object>();
			replyData.put("id", event.get("id"));
			replyData.put("data", reply);

			c.send("reply", replyData);
		}
	}

	// Calls a business logic handler
	private Object handle(String id, String type, Object data) {
		// You can enhance this tedious process by making cache
		AtmosphereConfig config = ((AtmosphereConnection) connections.get(id)).resource.getAtmosphereConfig();
		Collection<String> mappings = config.getServletContext().getServletRegistration(config.getServletConfig().getServletName()).getMappings(); 
		Class<?> handlerClass = null;
		Method handlerMethod = null;
		
		// Scans annotated classes by using org.reflections.Reflections
		outer: for (Class<?> clazz : new Reflections("").getTypesAnnotatedWith(EventHandler.class)) {
			EventHandler eventHandler = clazz.getAnnotation(EventHandler.class);
			// The value should be a default value or be contained in this servlet's mappings
			if (eventHandler.value().equals("") || mappings.contains(eventHandler.value())) {
				if (clazz.isAnnotationPresent(On.class)) {
					// @EventHandler("/chat")
					// @On("message")
					// public class ChatMessageHandler {
					//     public void execute() {}
					// }
					if (clazz.getAnnotation(On.class).value().equals(type)) {
						handlerClass = clazz;
						try {
							handlerMethod = handlerClass.getMethod("execute", new Class[0]);
							break outer;
						} catch (SecurityException e) {
						} catch (NoSuchMethodException e) {
						}
					}
				} else {
					// @EventHandler("/chat")
					// public class ChatHandler {
					//     @On("message")
					//     public void message() {}
					// }
					for (Method method : clazz.getMethods()) {
						if (method.isAnnotationPresent(On.class)
								&& method.getAnnotation(On.class).value().equals(type)
								&& method.getParameterTypes().length == 0) {
							handlerClass = clazz;
							handlerMethod = method;
							break outer;
						}
					}
				}
			}
		}

		if (handlerClass != null && handlerMethod != null) {
			try {
				Object handler = handlerClass.newInstance();
				
				Map<String, Object> fields = new LinkedHashMap<String, Object>();
				fields.put("connections", connections);
				fields.put("connection", connections.get(id));
				fields.put("data", data);
				
				// Fills reserved fields
				for (Entry<String, Object> entry : fields.entrySet()) {
					try {
						Field field = handlerClass.getDeclaredField(entry.getKey());
						field.setAccessible(true);
						field.set(handler, entry.getValue());
					} catch (SecurityException e) {
					} catch (NoSuchFieldException e) {
					} catch (IllegalArgumentException e) {
					} catch (IllegalAccessException e) {
					}
				}
				
				// Invokes the method
				return handlerMethod.invoke(handler, new Object[0]);
			} catch (InstantiationException e) {
			} catch (IllegalAccessException e) {
			} catch (SecurityException e) {
			} catch (IllegalArgumentException e) {
			} catch (InvocationTargetException e) {
			}
		}
		
		return null;
	}

}