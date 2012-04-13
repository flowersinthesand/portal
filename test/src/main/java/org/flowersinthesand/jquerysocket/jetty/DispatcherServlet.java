package org.flowersinthesand.jquerysocket.jetty;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;
import org.flowersinthesand.jquerysocket.Connection;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@SuppressWarnings("serial")
public abstract class DispatcherServlet extends WebSocketServlet {
	
	// A map of connection identifiers and objects
	private Map<String, Connection> connections = new ConcurrentHashMap<String, Connection>();
	// A map of callback identifiers and objects
	private Map<String, Connection.Callback<?>> callbacks = new ConcurrentHashMap<String, Connection.Callback<?>>();
	// Unit of works
	private BlockingQueue<Object[]> queue = new LinkedBlockingQueue<Object[]>();
	// Thread to send data
	private Thread sender = new Thread(new Runnable() {
		@Override
		public void run() {
			while (true) {
				try {
					// Waits until a unit of work arrives
					Object[] objects = queue.take();
					try {
						((AbstractConnection) objects[0]).doSend((String) objects[1]);
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
				} catch (InterruptedException e) {
					break;
				}
			}
		}
	});
	
	public void init(ServletConfig config) throws ServletException {
		super.init(config);
		sender.start();
	}
	
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
			sendWithCallback("message", data, null);
		}

		@Override
		public void send(String event, Object data) {
			sendWithCallback(event, data, null);
		}
		
		@Override
		public void sendWithCallback(Object data, Callback<?> callback) {
			sendWithCallback("message", data, callback);
		}
		
		@Override
		public void sendWithCallback(String event, Object datum, Callback<?> callback) {
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

			transmit(map);
		}
		
		void transmit(Object data) {
			try {
				// Puts a unit of work to send data into the queue
				queue.put(new Object[] {this, new Gson().toJson(data)});
			} catch (InterruptedException e) {
				throw new RuntimeException(e);
			}
		}
	
		abstract void doSend(String data) throws IOException;
	
	}

	// POST
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// Some Internet Explorer sends wrong encoded data for some reason
		request.setCharacterEncoding("utf-8");
		// Because the Content-Type is not application/x-www-form-urlencoded but text/plain on account of XDomainRequest,
		// You should use the POST request's message body to retrieve a message instead of request.getParameter method 
		// See the fourth at http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
		String message = request.getReader().readLine();
		if (message != null) {
			// By default, message is a JSON string representing an event
			Map<String, Object> event = new Gson().fromJson(message.substring("data=".length()), new TypeToken<Map<String, Object>>() {}.getType());
			fire(event);
		}
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
					c.data.put("heartbeat", new Long(heartbeat));
					connection.setMaxIdleTime(Integer.MAX_VALUE);
				} catch (NumberFormatException e) {}
				// Fires the open event
				connections.put(id, c);
				fire(id, "open");
			}

			@Override
			public void onClose(int code, String reason) {
				// Fires the close event
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
		void doSend(String data) throws IOException {
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
				// Fires the close event
				fire(id, "close");
			}
		});

		StreamConnection c = new StreamConnection();
		c.setData(request);
		c.asyncContext = asyncContext;

		// If the heartbeat is in number format, makes the max idle time infinite 
		try {
			c.data.put("heartbeat", new Long(request.getParameter("heartbeat")));
			asyncContext.setTimeout(0);
		} catch (NumberFormatException e) {}
		
		// sse requires padding of white space ending with \n
		// streamxdr, streamiframe and streamxhr in Webkit require padding of any character
		PrintWriter writer = response.getWriter();
		writer.print(Arrays.toString(new float[400]).replaceAll(".", " "));
		writer.print("\n");
		writer.flush();

		// Fires the open event
		connections.put(id, c);
		fire(id, "open");
	}

	private class StreamConnection extends AbstractConnection {

		AsyncContext asyncContext;

		@Override
		void doSend(String data) throws IOException {
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
		
		// A new request doesn't mean the start of a new connection in the long poll transport
		LongPollConnection c = connections.containsKey(id) ? (LongPollConnection) connections.get(id) : new LongPollConnection();
		c.setData(request);
		c.asyncContext = asyncContext;
		c.jsonp = transport.equals("longpolljsonp") ? request.getParameter("callback") : null;
		
		// If the heartbeat is in number format, makes the max idle time infinite 
		try {
			c.data.put("heartbeat", new Long(request.getParameter("heartbeat")));
			asyncContext.setTimeout(0);
		} catch (NumberFormatException e) {}
		
		// If this request is first
		if ("1".equals(request.getParameter("count"))) {
			// To tell the client that the server accepts the request, sends an empty string
			// the first response text doesn't matter but can't be empty 
			PrintWriter writer = response.getWriter();
			if (c.jsonp == null) {
				writer.print(" ");
			} else {
				writer.print(c.jsonp);
				writer.print("()");
			}
			writer.flush();
			asyncContext.complete();
			// Fires the open event
			connections.put(id, c);
			fire(id, "open");
		// If the connection's buffer is not empty, flushes them
		} else {
			try {
				if (c.sending.get()) {
					c.latch.await();
				}
			} catch (InterruptedException e) {
			} finally {
				if (!c.buffer.isEmpty()) {
					c.transmit(c.buffer);
				}
			}
		}
	}

	private class LongPollConnection extends AbstractConnection {

		AtomicBoolean sending = new AtomicBoolean();
		CountDownLatch latch;
		List<Map<String, Object>> buffer = new CopyOnWriteArrayList<Map<String, Object>>();
		AsyncContext asyncContext;
		String jsonp;

		@Override
		@SuppressWarnings("unchecked")
		void doSend(String data) throws IOException {
			sending.set(true);
			latch = new CountDownLatch(1);
			if (asyncContext.getRequest().isAsyncStarted()) {
				if (data.startsWith("[")) {
					buffer.clear();
				}
				
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
				if (data.startsWith("[")) {
					buffer.addAll(new Gson().fromJson(data, List.class));
				} else {
					buffer.add(new Gson().fromJson(data, Map.class));
				}
			}
			latch.countDown();
			sending.set(false);
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

	// Business logic
	public abstract Object handle(String id, String type, Object data);
	
	public Map<String, Connection> getConnections() {
		return connections;
	}
	
}