package org.flowersinthesand.chat;

import java.io.IOException;
import java.io.PrintWriter;

import org.atmosphere.cpr.AtmosphereHandler;
import org.atmosphere.cpr.AtmosphereRequest;
import org.atmosphere.cpr.AtmosphereResource;
import org.atmosphere.cpr.AtmosphereResourceEvent;
import org.atmosphere.cpr.AtmosphereResourceEventListener;
import org.atmosphere.cpr.AtmosphereResponse;
import org.atmosphere.cpr.BroadcasterFactory;

import com.google.gson.Gson;

public class ChatAtmosphereHandler implements AtmosphereHandler {

	@Override
	public void onRequest(AtmosphereResource resource) throws IOException {
		AtmosphereRequest request = resource.getRequest();
		AtmosphereResponse response = resource.getResponse();

		if (request.getMethod().equalsIgnoreCase("GET")) {
			final String id = request.getParameter("id");
			String transport = request.getParameter("transport");

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
					fire(new SocketEvent("open").setSocket(id));
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
					fire(new SocketEvent("close").setSocket(id));
				}
			});
			resource.suspend(20 * 1000, false);
		} else if (request.getMethod().equalsIgnoreCase("POST")) {
			request.setCharacterEncoding("utf-8");
			response.setHeader("Access-Control-Allow-Origin", "*");

			String data = request.getReader().readLine();
			if (data != null) {
				data = data.startsWith("data=") ? data.substring("data=".length()) : data;
				fire(new Gson().fromJson(data, SocketEvent.class));
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

		String data = new Gson().toJson(event.getMessage());
		PrintWriter writer = response.getWriter();

		if ("ws".equals(request.getParameter("transport"))) {
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

	private void fire(SocketEvent event) {
		handle(event);
	}

	private void handle(SocketEvent event) {
		if (event.getType().equals("message")) {
			BroadcasterFactory.getDefault().lookup("/chat").broadcast(new SocketEvent("message").setData(event.getData()));
		}
	}

}
