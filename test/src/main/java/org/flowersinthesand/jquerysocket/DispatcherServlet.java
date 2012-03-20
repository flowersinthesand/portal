package org.flowersinthesand.jquerysocket;

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

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;
import org.reflections.Reflections;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@SuppressWarnings("serial")
public class DispatcherServlet extends WebSocketServlet {
	
	// A map of connection identifiers and objects
	private Map<String, Connection> connections = new ConcurrentHashMap<String, Connection>();
	// A map of callback identifiers and objects
	private Map<String, Connection.Callback<?>> callbacks = new ConcurrentHashMap<String, Connection.Callback<?>>();
	
	// GET
	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// WebSocketServlet executes doWebSocketConnect method instead of doGet method if the request is a valid WebSocket request
		String transport = request.getParameter("transport");
		if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			doStreamConnect(request, response, transport);
		} else if (transport.equals("longpollajax") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			doLongPollConnect(request, response, transport);
		}
	}
	
	private abstract class AbstractConnection implements Connection {

		Map<String, Object> data = new ConcurrentHashMap<String, Object>();
		AtomicInteger eventId = new AtomicInteger(0);
		Timer heartbeatTimer;
		
		void setData(HttpServletRequest request) {
			data.put("request", request);
			data.put("id", request.getParameter("id"));
			data.put("transport", request.getParameter("transport"));
			data.put("heartbeat", request.getParameter("id"));
		}

		void setHeartbeat() {
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
			
			try {
				transmit(new Gson().toJson(map));
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
		}
	
		abstract void transmit(String data) throws IOException;
	
	}

	// POST
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// Some Internet Explorer sends wrong encoded data for some reason
		request.setCharacterEncoding("utf-8");
		// Because the Content-Type is not application/x-www-form-urlencoded but text/plain on account of XDomainRequest,
		// You should use the POST request's message body to retrieve a message instead of request.getParameter method 
		// See the fourth at http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
		String message = request.getReader().readLine().substring("data=".length());
		// By default, message is a JSON string representing an event
		Map<String, Object> event = new Gson().fromJson(message, new TypeToken<Map<String, Object>>() {}.getType());
		fire(event);
		// CORS
		response.setHeader("Access-Control-Allow-Origin", "*");
	}

	// Handles ws transport
	@Override
	public WebSocket doWebSocketConnect(HttpServletRequest request, String protocol) {
		final String id = request.getParameter("id");
		final String heartbeat = request.getParameter("heartbeat"); 
		final WebSocketConnection c = new WebSocketConnection();
		c.setData(request);

		return new WebSocket.OnTextMessage() {
			@Override
			public void onOpen(WebSocket.Connection connection) {
				c.connection = connection;
				// If the heartbeat is in number format, makes the max idle time infinite 
				try {
					new Long(heartbeat);
					connection.setMaxIdleTime(Integer.MAX_VALUE);
				} catch (NumberFormatException e) {}
				connections.put(id, c);
				fire(id, "open");
			}

			@Override
			public void onClose(int code, String reason) {
				fire(id, "close");
			}

			@Override
			public void onMessage(String message) {
				// By default, message is a JSON string representing an event
				Map<String, Object> event = new Gson().fromJson(message, new TypeToken<Map<String, Object>>() {}.getType());
				fire(event);
			}
		};
	}

	private class WebSocketConnection extends AbstractConnection {

		WebSocket.Connection connection;

		@Override
		void transmit(String data) throws IOException {
			connection.sendMessage(data);
		}

		@Override
		public void close() {
			connection.close();
		}

	}

	// Handles streamiframe, streamxdr, streamxhr and sse transport
	private void doStreamConnect(HttpServletRequest request, HttpServletResponse response, String transport) throws ServletException, IOException {
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

		final String id = request.getParameter("id");
		AsyncContext asyncContext = request.startAsync();
		asyncContext.addListener(new AsyncListener() {
			@Override
			public void onStartAsync(AsyncEvent event) throws IOException {

			}

			@Override
			public void onTimeout(AsyncEvent event) throws IOException {
				cleanup();
			}

			@Override
			public void onError(AsyncEvent event) throws IOException {
				cleanup();
			}

			@Override
			public void onComplete(AsyncEvent event) throws IOException {
				cleanup();
			}

			void cleanup() {
				fire(id, "close");
			}
		});
		// If the heartbeat is in number format, makes the max idle time infinite 
		try {
			new Long(request.getParameter("heartbeat"));
			asyncContext.setTimeout(0);
		} catch (NumberFormatException e) {}

		StreamConnection c = new StreamConnection();
		c.setData(request);
		c.asyncContext = asyncContext;

		// sse requires padding of white space ending with \n
		// streamxdr, streamiframe and streamxhr in Webkit require padding of any character
		PrintWriter writer = response.getWriter();
		writer.print(Arrays.toString(new float[400]).replaceAll(".", " "));
		writer.print("\n");
		writer.flush();

		connections.put(id, c);
		fire(id, "open");
	}

	private class StreamConnection extends AbstractConnection {

		AsyncContext asyncContext;

		@Override
		void transmit(String data) throws IOException {
			// streamxdr, streamiframe, streamxhr and sse require a message to be formatted according to event stream format
			// http://www.w3.org/TR/eventsource/#event-stream-interpretation
			PrintWriter writer = asyncContext.getResponse().getWriter();

			for (String datum : data.split("\r\n|\r|\n")) {
				writer.print("data: ");
				writer.print(datum);
				writer.print("\n");
			}

			writer.print("\n");
			writer.flush();
		}

		@Override
		public void close() {
			asyncContext.complete();
		}

	}

	// Handles longpollajax, longpollxdr and longpolljsonp transport
	private void doLongPollConnect(HttpServletRequest request, HttpServletResponse response, String transport) throws ServletException, IOException {
		// According to convention
		response.setCharacterEncoding("utf-8");
		// longpollxdr requires 'Access-Control-Allow-Origin' header to be set to '*'
		// http://msdn.microsoft.com/en-us/library/cc288060%28v=VS.85%29.aspx
		response.setHeader("Access-Control-Allow-Origin", "*");
		// longpolljsonp requires the content type to be 'text/javascript'
		response.setContentType("text/" + (transport.equals("longpolljsonp") ? "javascript" : "plain"));

		final String id = request.getParameter("id");
		AsyncContext asyncContext = request.startAsync();
		asyncContext.addListener(new AsyncListener() {
			@Override
			public void onStartAsync(AsyncEvent event) throws IOException {

			}

			@Override
			public void onTimeout(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			@Override
			public void onError(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			@Override
			public void onComplete(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			void cleanup(AsyncEvent event) {
				// The completion of the request with no response means the end of the connection 
				if (!event.getAsyncContext().getResponse().isCommitted()) {
					fire(id, "close");
				}
			}
		});
		// If the heartbeat is in number format, makes the max idle time infinite 
		try {
			new Long(request.getParameter("heartbeat"));
			asyncContext.setTimeout(0);
		} catch (NumberFormatException e) {}
		
		// A new request doesn't mean the start of a new connection in the long poll transport
		LongPollConnection c = connections.containsKey(id) ? (LongPollConnection) connections.get(id) : new LongPollConnection();
		c.setData(request);
		c.asyncContext = asyncContext;
		c.jsonp = transport.equals("longpolljsonp") ? request.getParameter("callback") : null;
		
		// To tell the client that the server accepts the request, sends an empty string
		if ("1".equals(request.getParameter("count"))) {
			c.send(" ");
			connections.put(id, c);
			fire(id, "open");
		// If the connection's buffer is not empty, flushes them
		} else if (!c.buffer.isEmpty()) {
			c.transmit(new Gson().toJson(c.buffer));
			c.buffer.clear();
		}
	}

	private class LongPollConnection extends AbstractConnection {

		List<Map<String, Object>> buffer = new CopyOnWriteArrayList<Map<String, Object>>();
		AsyncContext asyncContext;
		String jsonp;

		@Override
		@SuppressWarnings("unchecked")
		void transmit(String data) throws IOException {
			if (asyncContext.getRequest().isAsyncStarted()) {
				PrintWriter writer = asyncContext.getResponse().getWriter();

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
				// The real connection should be completed after sending a message 
				asyncContext.complete();
			} else {
				// If the real connection is not available, accumulates it to the buffer
				buffer.add(new Gson().fromJson(data, Map.class));
			}
		}

		@Override
		public void close() {
			// Closes the real connection if possible
			if (asyncContext.getRequest().isAsyncStarted()) {
				asyncContext.complete();
			}
		}

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
		
		AbstractConnection c = (AbstractConnection) connections.get(id);
		String type = (String) event.get("type");
		Object data = event.get("data");
	
		if (type.equals("open")) {
			// If the heartbeat is in number format, sets a heartbeat timer 
			try {
				c.data.put("heartbeat", new Long((String) c.data.get("heartbeat")));
				c.setHeartbeat();
			} catch (NumberFormatException e) {}
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

		// If the client requires a reply, sends a reply event with the above data 
		if (type.equals("close")) {
			// Removes the completed connection
			connections.remove(id);
		} else if (event.containsKey("reply") && (Boolean) event.get("reply")) {
			Map<String, Object> replyData = new LinkedHashMap<String, Object>();
			replyData.put("id", event.get("id"));
			replyData.put("data", reply);

			c.send("reply", replyData);
		}
	}

	// Calls a business logic handler
	private Object handle(String id, String type, Object data) {
		// You can enhance this tedious process by making cache
		Collection<String> mappings = getServletContext().getServletRegistration(getServletName()).getMappings();
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