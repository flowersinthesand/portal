package com.github.flowersinthesand.jquerysocket.servlet;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Arrays;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;

// TODO move to jquery-socket-servlet
public class Connection {

	private Queue<String> queue;
	private AsyncContext asyncContext;
	private String id;
	private String transport;
	private String callback;

	public Connection() {
		queue = new ConcurrentLinkedQueue<String>();
	}
	
	public void setAsyncContext(AsyncContext ac) throws IOException {
		this.asyncContext = ac;

		HttpServletRequest request = (HttpServletRequest) this.asyncContext.getRequest();
		HttpServletResponse response = (HttpServletResponse) this.asyncContext.getResponse();

		setId(request.getParameter("id"));
		transport = request.getParameter("transport");
		callback = request.getParameter("callback");

		this.asyncContext.addListener(new AsyncListener() {
			public void onComplete(AsyncEvent event) throws IOException {
				connections.remove(id);
			}

			public void onTimeout(AsyncEvent event) throws IOException {
				connections.remove(id);
			}

			public void onError(AsyncEvent event) throws IOException {
				connections.remove(id);
			}

			public void onStartAsync(AsyncEvent event) throws IOException {

			}
		});

		response.setContentType("text/" + (transport.equals("longpolljsonp") ? "javascript" : transport.equals("sse") ? "event-stream" : "plain"));
		response.setHeader("Access-Control-Allow-Origin", "*");

		if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			PrintWriter writer = response.getWriter();
			writer.println(Arrays.toString(new float[400]).replaceAll(".", " "));
			writer.flush();
		}

		while (this.asyncContext != null && !queue.isEmpty()) {
			this.send(queue.poll());
		}
	}

	public void setId(String id) {
		if (this.id == null) {
			this.id = id;
		}
	}

	public AsyncContext getAsyncContext() {
		return asyncContext;
	}

	public String getId() {
		return id;
	}

	public void send(String data) throws IOException {
		if (asyncContext == null) {
			queue.offer(data);
		} else {
			PrintWriter writer = asyncContext.getResponse().getWriter();
			writer.print(format(data));
			writer.flush();

			if (transport.equals("longpollxhr") || transport.equals("longpolljsonp")) {
				asyncContext.complete();
				asyncContext = null;
			}
		}
	}

	private String format(String string) {
		StringBuilder builder = new StringBuilder();

		if ("longpollxhr".equals(transport)) {
			builder.append(string);
		} else if ("longpolljsonp".equals(transport)) {
			builder.append(callback).append("(").append(new Gson().toJson(string)).append(")");
		} else {
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
		}

		connections.remove(id);
	}

	private static final Map<String, Connection> connections = new ConcurrentHashMap<String, Connection>();

	public static final Connection find(String id) {
		if (!connections.containsKey(id)) {
			Connection connection = new Connection();
			connection.setId(id);

			connections.put(id, connection);
		}

		return connections.get(id);
	}

}
