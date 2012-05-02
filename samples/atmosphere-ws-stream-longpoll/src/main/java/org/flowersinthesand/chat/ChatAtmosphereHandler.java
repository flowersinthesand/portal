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
			}
			
			resource.addEventListener(new AtmosphereResourceEventListener() {
				@Override
				public void onSuspend(AtmosphereResourceEvent event) {
					if (!transport.startsWith("longpoll") || first) {
						fire(new SocketEvent("open").setSocket(id));
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
						fire(new SocketEvent("close").setSocket(id));
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

	private void fire(SocketEvent event) {
		handle(event);
	}

	private void handle(SocketEvent event) {
		if (event.getType().equals("message")) {
			BroadcasterFactory.getDefault().lookup("/chat").broadcast(new SocketEvent("message").setData(event.getData()));
		}
	}

}
