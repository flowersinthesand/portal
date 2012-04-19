package org.flowersinthesand.chat;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.concurrent.atomic.AtomicLong;

import org.atmosphere.cache.BroadcasterCacheBase;
import org.atmosphere.cpr.AtmosphereHandler;
import org.atmosphere.cpr.AtmosphereRequest;
import org.atmosphere.cpr.AtmosphereResource;
import org.atmosphere.cpr.AtmosphereResourceEvent;
import org.atmosphere.cpr.AtmosphereResourceEventListener;
import org.atmosphere.cpr.AtmosphereResourceImpl;
import org.atmosphere.cpr.AtmosphereResponse;
import org.atmosphere.cpr.BroadcastFilter;

import com.google.gson.Gson;

public class ChatAtmosphereHandler implements AtmosphereHandler {

	@Override
	public void onRequest(AtmosphereResource resource) throws IOException {
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();

		if (request.getMethod().equalsIgnoreCase("GET")) {
			final String id = request.getParameter("id");
			final String transport = request.getParameter("transport");
			final boolean first = "1".equals(request.getParameter("count"));

			response.setCharacterEncoding("utf-8");
			response.setHeader("Access-Control-Allow-Origin", "*");

			if (transport.equals("sse") || transport.startsWith("stream")) {
				response.setContentType("text/" + ("sse".equals(transport) ? "event-stream" : "plain"));
				PrintWriter writer = response.getWriter();
				for (int i = 0; i < 2000; i++) {
					writer.print(' ');
				}
				writer.print("\n");
				writer.flush();
			} else if (transport.startsWith("longpoll")) {
				response.setContentType("text/" + ("longpolljsonp".equals(transport) ? "javascript" : "plain"));
				// TODO will be remove in version alpha 3
				if (first) {
					PrintWriter writer = response.getWriter();
					writer.print(request.getParameter("callback"));
					writer.print("()");
					writer.flush();
				}
			}
			
			resource.addEventListener(new AtmosphereResourceEventListener() {
				@Override
				public void onSuspend(AtmosphereResourceEvent event) {
					if (!transport.startsWith("longpoll") || first) {
						fire(new Event("open").socket(id).resource(event.getResource()));
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
					if (!transport.startsWith("longpoll") || (!first && !event.getResource().getResponse().isCommitted())) {
						fire(new Event("close").socket(id).resource(event.getResource()));
					}
				}
			});
			resource.suspend(20 * 1000, false);
			if (transport.startsWith("longpoll") && first) {
				resource.resume();
			}
		} else if (request.getMethod().equalsIgnoreCase("POST")) {
			request.setCharacterEncoding("utf-8");
			response.setHeader("Access-Control-Allow-Origin", "*");

			String data = request.getReader().readLine();
			if (data != null) {
				data = data.startsWith("data=") ? data.substring("data=".length()) : data;
				fire(new Gson().fromJson(data, Event.class).resource(resource));
			}
		}
	}

	@Override
	public void onStateChange(AtmosphereResourceEvent event) throws IOException {
		AtmosphereResource resource = event.getResource();
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();
		if (event.getMessage() == null || event.isCancelled() || request.destroyed()) {
			return;
		}

		String transport = request.getParameter("transport");
		String data = new Gson().toJson(event.getMessage());
		PrintWriter writer = response.getWriter();

		if (transport.equals("ws")) {
			writer.print(data);
		} else if (transport.equals("sse") || transport.startsWith("stream")) {
			for (String datum : data.split("\r\n|\r|\n")) {
				writer.print("data: ");
				writer.print(datum);
				writer.print("\n");
			}
			writer.print("\n");
		} else if (transport.startsWith("longpoll")) {
			if (transport.equals("longpolljsonp")) {
				writer.print(request.getParameter("callback"));
				writer.print("(");
				writer.print(new Gson().toJson(data));
				writer.print(")");
			} else {
				writer.print(data);
			}
		}

		writer.flush();
		if (transport.startsWith("longpoll")) {
			resource.resume();
		}
	}

	@Override
	public void destroy() {

	}

	private void fire(Event event) {
		handle(event);
	}

	private void handle(Event event) {
		if (event.type.equals("message")) {
			event.resource.getBroadcaster().broadcast(new Event("message").data(event.data));
		}
	}

	private static class Event {
		private long id;
		private String socket;
		private String type;
		private Object data;
		private AtmosphereResource resource;

		public Event() {

		}

		public Event(String type) {
			this.type = type;
		}
		
		public Event id(long id) {
			this.id = id;
			return this;
		}

		public Event data(Object data) {
			this.data = data;
			return this;
		}

		public Event socket(String socket) {
			this.socket = socket;
			return this;
		}

		public Event resource(AtmosphereResource resource) {
			this.resource = resource;
			return this;
		}
	}

}
