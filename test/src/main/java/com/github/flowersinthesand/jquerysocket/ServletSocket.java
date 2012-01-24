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

	private HttpServletRequest request;
	private HttpServletResponse response;
	private AsyncContext asyncContext;
	private Timer longPollTimer;

	@Override
	public Socket open() {		
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
				if (tp.equals("longpollxhr") || tp.equals("longpollxdr") || tp.equals("longpolljsonp")) {
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
			new Long(params.get("heartbeat"));
			asyncContext.setTimeout(0);
		} catch (Exception e) {
		}

		String transport = params.get("transport");
		
		response.setContentType("text/" + (transport.equals("longpolljsonp") ? "javascript" : transport.equals("sse") ? "event-stream" : "plain"));
		response.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");
		
		if (transport.equals("longpollxhr") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			if (transport.equals("longpolljsonp")) {
				params.put("jsonpCallback", request.getParameter("callback"));
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
	protected void transmit(String data) throws IOException {
		PrintWriter writer = asyncContext.getResponse().getWriter();
		writer.print(format(data));
		writer.flush();

		String transport = params.get("transport");
		if (transport.equals("longpollxhr") || transport.equals("longpollxdr") || transport.equals("longpolljsonp")) {
			asyncContext.complete();
			asyncContext = null;
		}
	}

	protected String format(String string) {
		String transport = params.get("transport");
		StringBuilder builder = new StringBuilder();

		if ("longpollxhr".equals(transport) || "longpollxdr".equals(transport)) {
			builder.append(string);
		} else if ("longpolljsonp".equals(transport)) {
			builder.append(params.get("jsonpCallback")).append("(").append(new Gson().toJson(string)).append(")");
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

	public HttpServletRequest getRequest() {
		return request;
	}

	public void setRequest(HttpServletRequest request) {
		this.request = request;
		params.put("id", request.getParameter("id"));
		params.put("transport", request.getParameter("transport"));
		params.put("heartbeat", request.getParameter("heartbeat"));
	}

	public HttpServletResponse getResponse() {
		return response;
	}

	public void setResponse(HttpServletResponse response) {
		this.response = response;
	}

}
