package com.github.flowersinthesand.jquerysocket.servlet;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;

// TODO move to jquery-socket-servlet
public class Connection {

	private List<Map<String, Object>> events = new CopyOnWriteArrayList<Map<String, Object>>();
	private AsyncContext asyncContext;
	private String id;
	private String transport;
	private Timer longPollTimer;
	private String jsonpCallback;
	
	public void setAsyncContext(AsyncContext ac) throws IOException {
		this.asyncContext = ac;
		ac.addListener(new AsyncListener() {
			public void onComplete(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			public void onTimeout(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			public void onError(AsyncEvent event) throws IOException {
				cleanup(event);
			}

			public void onStartAsync(AsyncEvent event) throws IOException {

			}
			
			private void cleanup(AsyncEvent event) {
				String transport = event.getAsyncContext().getRequest().getParameter("transport");
				System.out.println(transport);
				if (transport.equals("longpollxhr") || transport.equals("longpolljsonp")) {
					longPollTimer = new Timer();
					longPollTimer.schedule(new TimerTask() {
						@Override
						public void run() {
							connections.remove(id);
						}
					}, 5000);
				} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
					connections.remove(id);
				}
			}
		});
		
		HttpServletRequest request = (HttpServletRequest) ac.getRequest();
		HttpServletResponse response = (HttpServletResponse) ac.getResponse();

		id = request.getParameter("id");
		transport = request.getParameter("transport");
		
		response.setContentType("text/" + (transport.equals("longpolljsonp") ? "javascript" : transport.equals("sse") ? "event-stream" : "plain"));
		response.setHeader("Access-Control-Allow-Origin", "*");
		
		if (transport.equals("longpollxhr") || transport.equals("longpolljsonp")) {
			jsonpCallback = request.getParameter("callback");
			if (longPollTimer != null) {
				longPollTimer.cancel();
			} else {
				events.add(0, new LinkedHashMap<String, Object>());
				events.get(0).put("type", "open");
			}
		} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			PrintWriter writer = response.getWriter();
			writer.println(Arrays.toString(new float[400]).replaceAll(".", " "));
			writer.flush();
		}
		
		if (!events.isEmpty()) {
			transmit(events);
			events.clear();
		}
	}

	public void setId(String id) {
		this.id = id;
	}

	public AsyncContext getAsyncContext() {
		return asyncContext;
	}

	public String getId() {
		return id;
	}

	public void send(Object data) throws IOException {
		send("message", data);
	}

	public void send(String type, Object data) throws IOException {
		Map<String, Object> event = new LinkedHashMap<String, Object>();
		event.put("type", type);
		event.put("data", data);

		if (asyncContext == null) {
			events.add(event);
		} else {
			transmit(event);
		}
	}

	private void transmit(Object data) throws IOException {
		PrintWriter writer = asyncContext.getResponse().getWriter();
		writer.print(format(new Gson().toJson(data)));
		writer.flush();

		if (transport.equals("longpollxhr") || transport.equals("longpolljsonp")) {
			asyncContext.complete();
			asyncContext = null;
		}
	}

	private String format(String string) {
		StringBuilder builder = new StringBuilder();

		if ("longpollxhr".equals(transport)) {
			builder.append(string);
		} else if ("longpolljsonp".equals(transport)) {
			builder.append(jsonpCallback).append("(").append(new Gson().toJson(string)).append(")");
		} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			for (String data : string.split("\r\n|\r|\n")) {
				builder.append("data: ").append(data).append("\n");
			}
			builder.append("\n");
		}

		return builder.toString();
	}

	public void close() throws IOException {
		if (asyncContext != null) {
			asyncContext.complete();
			asyncContext = null;
		}

		connections.remove(id);
	}

	private static final Map<String, Connection> connections = new ConcurrentHashMap<String, Connection>();

	public static final List<Connection> findAll() {
		return new ArrayList<Connection>(connections.values());
	}

	public static final Connection find(String id) {
		if (!connections.containsKey(id)) {
			Connection connection = new Connection();
			connection.setId(id);

			connections.put(id, connection);
		}

		return connections.get(id);
	}

}
