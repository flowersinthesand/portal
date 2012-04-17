package org.flowersinthesand.chat;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.catalina.websocket.MessageInbound;
import org.apache.catalina.websocket.StreamInbound;
import org.apache.catalina.websocket.WebSocketServlet;
import org.apache.catalina.websocket.WsOutbound;

import com.google.gson.Gson;

@WebServlet(urlPatterns = "/chat", asyncSupported = true)
public class ChatServlet extends WebSocketServlet {

	private static final long serialVersionUID = -8348163963937728320L;
	private static final ThreadLocal<HttpServletRequest> requestHolder = new ThreadLocal<HttpServletRequest>();

	private Map<String, ChatMessageInbound> connections = new ConcurrentHashMap<String, ChatMessageInbound>();
	private BlockingQueue<Event> queue = new LinkedBlockingQueue<Event>();
	private Thread broadcaster = new Thread(new Runnable() {
		@Override
		public void run() {
			while (true) {
				try {
					Event event = queue.take();
					for (Entry<String, ChatMessageInbound> entry : connections.entrySet()) {
						try {
							send(entry.getValue(), event);
						} catch (IOException ex) {
							fire(new Event("close").socket(entry.getKey()));
						}
					}
				} catch (InterruptedException e) {
					break;
				}
			}
		}
	});

	@Override
	public void init() throws ServletException {
		super.init();
		broadcaster.setDaemon(true);
		broadcaster.start();
	}

	@Override
	protected void service(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		requestHolder.set(request);
		super.service(request, response);
	}

	@Override
	protected StreamInbound createWebSocketInbound(String protocol) {
		HttpServletRequest request = requestHolder.get();
		return new ChatMessageInbound(request.getParameter("id"));
	}

	private void send(ChatMessageInbound messageInbound, Event event) throws IOException {
		String data = new Gson().toJson(event);
		messageInbound.getWsOutbound().writeTextMessage(CharBuffer.wrap(data));
	}

	private void fire(Event event) {
		if (event.type.equals("close")) {
			connections.remove(event.socket);
		}

		handle(event);
	}

	private void handle(Event event) {
		if (event.type.equals("message")) {
			queue.offer(new Event("message").data(event.data));
		}
	}

	private class ChatMessageInbound extends MessageInbound {
		String id;

		public ChatMessageInbound(String id) {
			this.id = id;
		}

		@Override
		protected void onOpen(WsOutbound outbound) {
			connections.put(id, this);
			fire(new Event("open").socket(id));
		}

		@Override
		protected void onClose(int status) {
			fire(new Event("close").socket(id));
		}

		@Override
		protected void onTextMessage(CharBuffer message) throws IOException {
			fire(new Gson().fromJson(message.toString(), Event.class));
		}

		@Override
		protected void onBinaryMessage(ByteBuffer message) throws IOException {
			throw new UnsupportedOperationException("Binary message not supported.");
		}
	}

	private static class Event {
		private String socket;
		private String type;
		private Object data;

		public Event() {

		}

		public Event(String type) {
			this.type = type;
		}

		public Event data(Object data) {
			this.data = data;
			return this;
		}

		public Event socket(String socket) {
			this.socket = socket;
			return this;
		}
	}

}