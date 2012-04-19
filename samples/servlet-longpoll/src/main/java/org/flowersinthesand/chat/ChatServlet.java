package org.flowersinthesand.chat;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;

@WebServlet(urlPatterns = "/chat", asyncSupported = true)
public class ChatServlet extends HttpServlet {

	private static final long serialVersionUID = -8348163963937728320L;

	private Map<String, AsyncContext> connections = new ConcurrentHashMap<String, AsyncContext>();
	private BlockingQueue<Event> queue = new LinkedBlockingQueue<Event>();
	private Thread broadcaster = new Thread(new Runnable() {
		@Override
		public void run() {
			while (true) {
				try {
					Event event = queue.take();
					for (Entry<String, AsyncContext> entry : connections.entrySet()) {
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
		broadcaster.setDaemon(true);
		broadcaster.start();
	}

	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		final String id = request.getParameter("id");
		String transport = request.getParameter("transport");
		final boolean first = "1".equals(request.getParameter("count"));
		AsyncContext asyncContext = request.startAsync();

		response.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");
		response.setContentType("text/" + ("longpolljsonp".equals(transport) ? "javascript" : "plain"));
		asyncContext.addListener(new AsyncListener() {
			public void onStartAsync(AsyncEvent event) throws IOException {

			}

			public void onComplete(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			public void onTimeout(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			public void onError(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			private void cleanup(AsyncEvent event) {
				if (!first && !event.getAsyncContext().getResponse().isCommitted()) {
					fire(new Event("close").socket(id));
				}
			}
		});

		connections.put(id, asyncContext);

		if (first) {
			// TODO will be remove in version alpha 3
			PrintWriter writer = response.getWriter();
			writer.print(request.getParameter("callback"));
			writer.print("()");
			writer.flush();
			
			asyncContext.complete();
			fire(new Event("open").socket(id));
		}
	}

	private void send(AsyncContext asyncContext, Event event) throws IOException {
		if (asyncContext.getRequest().isAsyncStarted()) {
			String data = new Gson().toJson(event);
			PrintWriter writer = asyncContext.getResponse().getWriter();

			if ("longpolljsonp".equals(asyncContext.getRequest().getParameter("transport"))) {
				writer.print(asyncContext.getRequest().getParameter("callback"));
				writer.print("(");
				writer.print(new Gson().toJson(data));
				writer.print(")");
			} else {
				writer.print(data);
			}

			writer.flush();
			asyncContext.complete();
		}
	}

	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");

		String data = request.getReader().readLine();
		if (data != null) {
			data = data.substring("data=".length());
			fire(new Gson().fromJson(data, Event.class));
		}
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

	private static class Event {
		private String socket;
		private String type;
		private Object data;

		@SuppressWarnings("unused")
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