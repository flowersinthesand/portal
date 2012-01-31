package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;

public class ServletSocket extends AbstractSocket {

	private String transport;
	private AsyncContext asyncContext;
	private Timer longPollTimer;

	@Override
	public Socket open() {
		HttpServletRequest request = (HttpServletRequest) data.get("request");
		
		data.put("id", request.getParameter("id"));
		data.put("transport", request.getParameter("transport"));
		data.put("heartbeat", request.getParameter("heartbeat"));
		
		asyncContext = request.startAsync();
		asyncContext.addListener(new AsyncListener() {
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
				asyncContext = null;
				
				String tp = event.getAsyncContext().getRequest().getParameter("transport");
				if (tp.equals("longpollajax") || tp.equals("longpollxdr") || tp.equals("longpolljsonp")) {
					longPollTimer = new Timer();
					longPollTimer.schedule(new TimerTask() {
						@Override
						public void run() {
							fire("close", null);
						}
					}, 5000);
				} else if (tp.equals("streamiframe") || tp.equals("streamxdr") || tp.equals("streamxhr") || tp.equals("sse")) {
					fire("close", null);
				}
			}
		});

		try {
			new Long((String) data.get("heartbeat"));
			asyncContext.setTimeout(0);
		} catch (Exception e) {
		}

		transport = (String) data.get("transport");
		HttpServletResponse response = (HttpServletResponse) data.get("response");
		
		response.setContentType("text/" + (transport.equals("longpolljsonp") ? "javascript" : transport.equals("sse") ? "event-stream" : "plain"));
		response.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");
		
		if (transport.equals("longpollajax") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			if (transport.equals("longpolljsonp")) {
				data.put("jsonpCallback", request.getParameter("callback"));
			}
			if (longPollTimer != null) {
				longPollTimer.cancel();
				if (!buffer.isEmpty()) {
					try {
						transmit(new Gson().toJson(buffer));
						buffer.clear();
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
				}
			} else {
				buffer.add(0, new LinkedHashMap<String, Object>());
				buffer.get(0).put("type", "open");
				fire("open", null);
			}
		} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			try {
				PrintWriter writer = response.getWriter();
				writer.println(Arrays.toString(new float[400]).replaceAll(".", " "));
				writer.flush();
				fire("open", null);
			} catch (IOException e) {
			}
		}
		
		return this;
	}
	
	@Override
	protected boolean sendable() {
		return asyncContext != null;
	}
	
	@Override
	protected void transmit(String dat) throws IOException {
		PrintWriter writer = asyncContext.getResponse().getWriter();
		writer.print(format(dat));
		writer.flush();

		if (transport.equals("longpollajax") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			asyncContext.complete();
			asyncContext = null;
		}
	}

	protected String format(String string) {
		StringBuilder builder = new StringBuilder();

		if ("longpollajax".equals(transport) || "longpollxdr".equals(transport)) {
			builder.append(string);
		} else if ("longpolljsonp".equals(transport)) {
			builder.append(data.get("jsonpCallback")).append("(").append(new Gson().toJson(string)).append(")");
		} else if (transport.equals("streamiframe") || transport.equals("streamxdr") || transport.equals("streamxhr") || transport.equals("sse")) {
			for (String data : string.split("\r\n|\r|\n")) {
				builder.append("data: ").append(data).append("\n");
			}
			builder.append("\n");
		}

		return builder.toString();
	}

	@Override
	public Socket close() {
		if (longPollTimer != null) {
			longPollTimer.cancel();
			longPollTimer = null;
		}
		if (asyncContext != null) {
			asyncContext.complete();
			asyncContext = null;
		} else {
			fire("close", null);
		}
		
		return this;
	}
	
}
