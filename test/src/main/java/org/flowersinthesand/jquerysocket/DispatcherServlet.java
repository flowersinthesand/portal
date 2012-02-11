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

@SuppressWarnings("serial")
public class DispatcherServlet extends WebSocketServlet {

	private Map<String, Connection> connections = new ConcurrentHashMap<String, Connection>();
	private Map<String, Connection.Callback<?>> callbacks = new ConcurrentHashMap<String, Connection.Callback<?>>();
	
	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String transport = request.getParameter("transport");
		if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			doStreamConnect(request, response, transport);
		} else if (transport.equals("longpollajax") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			doLongPollConnect(request, response, transport);
		}
	}

	@Override
	@SuppressWarnings("unchecked")
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		response.setHeader("Access-Control-Allow-Origin", "*");
		fire(new Gson().fromJson(request.getReader().readLine().substring("data=".length()), Map.class));
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
			try {
				c.data.put("heartbeat", new Long((String) c.data.get("heartbeat")));
				c.setHeartbeat();
			} catch (NumberFormatException e) {}
		} else if (type.equals("close")) {
			if (c.heartbeatTimer != null) {
				c.heartbeatTimer.cancel();
			}
			for (String callbackKey : callbacks.keySet()) {
				if (callbackKey.startsWith(id)) {
					callbacks.remove(callbackKey);
				}
			}
			connections.remove(id);
		} else if (type.equals("heartbeat")) {
			if (c.heartbeatTimer != null) {
				c.setHeartbeat();
				c.send("heartbeat", null);
			}
		} else if (type.equals("reply")) {
			Map<String, Object> replyData = (Map<String, Object>) data;
			String callbackKey = id + "." + replyData.get("id");
			
			if (callbacks.containsKey(callbackKey)) {
				((Connection.Callback<Object>) callbacks.get(callbackKey)).execute(replyData.get("data"));
				callbacks.remove(callbackKey);
			}
		}
	
		Collection<String> mappings = getServletContext().getServletRegistration(getServletName()).getMappings();
		Class<?> handlerClass = null;
		String handlerMethod = null;
		outer: for (Class<?> clazz : new Reflections("").getTypesAnnotatedWith(EventHandler.class)) {
			EventHandler eventHandler = clazz.getAnnotation(EventHandler.class);
			if (eventHandler.value().equals("") || mappings.contains(eventHandler.value())) {
				if (clazz.isAnnotationPresent(On.class)) {
					if (clazz.getAnnotation(On.class).value().equals(type)) {
						handlerClass = clazz;
						handlerMethod = "execute";
						break outer;
					}
				} else {
					for (Method method : clazz.getMethods()) {
						if (method.isAnnotationPresent(On.class) && method.getAnnotation(On.class).value().equals(type)) {
							handlerClass = clazz;
							handlerMethod = method.getName();
							break outer;
						}
					}
				}
			}
		}

		Object reply = null;
		if (handlerClass != null && handlerMethod != null) {
			try {
				Object handler = handlerClass.newInstance();
				
				Map<String, Object> fields = new LinkedHashMap<String, Object>();
				fields.put("connections", connections);
				fields.put("connection", c);
				fields.put("data", data);
				
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
	
				try {
					reply = handlerClass.getMethod(handlerMethod, new Class[0]).invoke(handler, new Object[0]);
				} catch (SecurityException e) {
				} catch (NoSuchMethodException e) {
				} catch (IllegalArgumentException e) {
				} catch (InvocationTargetException e) {
				}
			} catch (InstantiationException e) {
			} catch (IllegalAccessException e) {
			}
		}
	
		if (event.containsKey("reply") && (Boolean) event.get("reply")) {
			Map<String, Object> replyData = new LinkedHashMap<String, Object>();
			replyData.put("id", event.get("id"));
			replyData.put("data", reply);
	
			c.send("reply", replyData);
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
			eventId.incrementAndGet();
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

	private void doStreamConnect(HttpServletRequest request, HttpServletResponse response, String transport) throws ServletException, IOException {
		response.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");
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
		try {
			new Long(request.getParameter("heartbeat"));
			asyncContext.setTimeout(0);
		} catch (NumberFormatException e) {}

		StreamConnection c = new StreamConnection();
		c.setData(request);
		c.asyncContext = asyncContext;
		
		PrintWriter writer = response.getWriter();
		writer.print(Arrays.toString(new float[400]).replaceAll(".", " ") + "\n");
		writer.flush();
		connections.put(id, c);
		fire(id, "open");
	}

	private class StreamConnection extends AbstractConnection {

		AsyncContext asyncContext;

		@Override
		void transmit(String data) throws IOException {
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

	private void doLongPollConnect(HttpServletRequest request, HttpServletResponse response, String transport) throws ServletException, IOException {
		response.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");
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
				if (!event.getAsyncContext().getResponse().isCommitted()) {
					fire(id, "close");
				}
			}
		});
		try {
			new Long(request.getParameter("heartbeat"));
			asyncContext.setTimeout(0);
		} catch (NumberFormatException e) {}
		
		LongPollConnection c = connections.containsKey(id) ? (LongPollConnection) connections.get(id) : new LongPollConnection();
		c.setData(request);
		c.asyncContext = asyncContext;
		c.jsonp = transport.equals("longpolljsonp") ? request.getParameter("callback") : null;
		
		if ("1".equals(request.getParameter("count"))) {
			c.send(" ");
			connections.put(id, c);
			fire(id, "open");
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
					writer.print(jsonp);
					writer.print("(");
					writer.print(new Gson().toJson(data));
					writer.print(")");
				}
				
				writer.flush();
				asyncContext.complete();
			} else {
				buffer.add(new Gson().fromJson(data, Map.class));
			}
		}
		
		@Override
		public void close() {
			if (asyncContext.getRequest().isAsyncStarted()) {
				asyncContext.complete();
			}
		}
		
	}

	@Override
	public WebSocket doWebSocketConnect(HttpServletRequest request, String protocol) {
		final String id = request.getParameter("id");
		final WebSocketConnection c = new WebSocketConnection();
		c.setData(request);
		
		return new WebSocket.OnTextMessage() {
			@Override
			public void onOpen(WebSocket.Connection connection) {
				c.connection = connection;
				connections.put(id, c);
				fire(id, "open");
			}

			@Override
			public void onClose(int code, String reason) {
				fire(id, "close");
			}

			@Override
			@SuppressWarnings("unchecked")
			public void onMessage(String data) {
				fire(new Gson().fromJson(data, Map.class));
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

}