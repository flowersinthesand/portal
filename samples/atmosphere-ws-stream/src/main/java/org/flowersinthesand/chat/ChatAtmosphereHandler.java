package org.flowersinthesand.chat;

import java.io.IOException;
import java.io.PrintWriter;

import org.atmosphere.cpr.AtmosphereHandler;
import org.atmosphere.cpr.AtmosphereRequest;
import org.atmosphere.cpr.AtmosphereResource;
import org.atmosphere.cpr.AtmosphereResourceEvent;
import org.atmosphere.cpr.AtmosphereResourceEventListener;
import org.atmosphere.cpr.AtmosphereResponse;

import com.google.gson.Gson;

public class ChatAtmosphereHandler implements AtmosphereHandler {

	@Override
	public void onRequest(AtmosphereResource resource) throws IOException {
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();

		if (request.getMethod().equalsIgnoreCase("GET")) {
			final String id = request.getParameter("id");
			final String transport = request.getParameter("transport");

			if (!transport.equals("ws")) {
				response.setCharacterEncoding("utf-8");
				response.setHeader("Access-Control-Allow-Origin", "*");
				response.setContentType("text/" + ("sse".equals(transport) ? "event-stream" : "plain"));
				PrintWriter writer = response.getWriter();
				for (int i = 0; i < 2000; i++) {
					writer.print(' ');
				}
				writer.print("\n");
				writer.flush();
			}

			resource.addEventListener(new AtmosphereResourceEventListener() {
				@Override
				public void onSuspend(AtmosphereResourceEvent event) {
					Event e = new Event();
					e.socket = id;
					e.type = "open";
					e.resource = event.getResource();

					fire(e);
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
					Event e = new Event();
					e.socket = id;
					e.type = "close";
					e.resource = event.getResource();

					fire(e);
				}
			});
			resource.suspend(20 * 1000, false);
		} else if (request.getMethod().equalsIgnoreCase("POST")) {
			request.setCharacterEncoding("utf-8");
			response.setHeader("Access-Control-Allow-Origin", "*");

			String data = request.getReader().readLine();
			if (data != null) {
				data = data.startsWith("data=") ? data.substring("data=".length()) : data;

				Event event = new Gson().fromJson(data, Event.class);
				event.resource = resource;

				fire(event);
			}
		}
	}

	@Override
	public void onStateChange(AtmosphereResourceEvent event) throws IOException {
		AtmosphereResource resource = event.getResource();
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();

		String data = new Gson().toJson(event.getMessage());
		String transport = request.getParameter("transport");
		PrintWriter writer = response.getWriter();

		if (transport.equals("ws")) {
			writer.print(data);
		} else {
			for (String datum : data.split("\r\n|\r|\n")) {
				writer.print("data: ");
				writer.print(datum);
				writer.print("\n");
			}
			writer.print("\n");
		}

		writer.flush();
	}

	@Override
	public void destroy() {

	}

	private void fire(Event event) {
		handle(event);
	}

	private void handle(Event event) {
		if (event.type.equals("message")) {
			event.resource.getBroadcaster().broadcast(new Event("message", event.data));
		}
	}

	private static class Event {
		private String socket;
		private String type;
		private Object data;
		private AtmosphereResource resource;

		public Event() {

		}

		public Event(String type, Object data) {
			this.type = type;
			this.data = data;
		}
	}

}
