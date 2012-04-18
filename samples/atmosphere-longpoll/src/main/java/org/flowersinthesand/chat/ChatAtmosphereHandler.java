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
			String transport = request.getParameter("transport");
			final boolean first = "1".equals(request.getParameter("count"));

			response.setCharacterEncoding("utf-8");
			response.setHeader("Access-Control-Allow-Origin", "*");
			response.setContentType("text/" + ("longpolljsonp".equals(transport) ? "javascript" : "plain"));
			// TODO will be remove in version alpha 3
			if (first) {
				PrintWriter writer = response.getWriter();
				writer.print(request.getParameter("callback"));
				writer.print("()");
				writer.flush();
			}

			resource.addEventListener(new AtmosphereResourceEventListener() {
				@Override
				public void onSuspend(AtmosphereResourceEvent event) {
					if (first) {
						event.getResource().resume();
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
					if (!first && !event.getResource().getResponse().isCommitted()) {
						fire(new Event("close").socket(id).resource(event.getResource()));
					}
				}
			});
			resource.suspend(20 * 1000, false);
		} else if (request.getMethod().equalsIgnoreCase("POST")) {
			request.setCharacterEncoding("utf-8");
			response.setHeader("Access-Control-Allow-Origin", "*");

			String data = request.getReader().readLine();
			if (data != null) {
				data = data.substring("data=".length());
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

		String data = new Gson().toJson(event.getMessage());
		PrintWriter writer = response.getWriter();

		if ("longpolljsonp".equals(request.getParameter("transport"))) {
			writer.print(request.getParameter("callback"));
			writer.print("(");
			writer.print(new Gson().toJson(data));
			writer.print(")");
		} else {
			writer.print(data);
		}

		writer.flush();
		resource.resume();
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

	public static class EventIdBroadcasterFilter implements BroadcastFilter {

		private AtomicLong id = new AtomicLong();

		@Override
		public BroadcastAction filter(Object originalMessage, Object message) {
			if (message instanceof Event) {
				((Event) message).id(id.incrementAndGet());
			}

			return new BroadcastAction(message);
		}

	}

	public static class EventIdBroadcasterCache extends BroadcasterCacheBase {

		public void cache(AtmosphereResource resource, CachedMessage cm) {

		}

		public CachedMessage retrieveLastMessage(AtmosphereResource resource) {
			AtmosphereResourceImpl r = AtmosphereResourceImpl.class.cast(resource);

			if (!r.isInScope()) {
				return null;
			}

			return retrieveUsingEventId(r.getRequest().getParameter("lastEventId"));
		}

		private CachedMessage retrieveUsingEventId(String lastEventIdString) {
			if ("".equals(lastEventIdString)) {
				return null;
			}

			long lastEventId = Long.valueOf(lastEventIdString);
			CachedMessage prev = null;
			for (CachedMessage cm : queue) {
				long id = ((Event) cm.message()).id;
				if (id > lastEventId) {
					return prev;
				}
				
				prev = cm;
			}

			return prev;
		}

	}

}
