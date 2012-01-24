package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;

import com.google.gson.Gson;

public abstract class AbstractSocket implements Socket {

	@SuppressWarnings("rawtypes")
	protected ConcurrentHashMap<String, ConcurrentLinkedQueue<Socket.EventHandler>> events = new ConcurrentHashMap<String, ConcurrentLinkedQueue<EventHandler>>();
	protected CopyOnWriteArrayList<Map<String, Object>> buffer = new CopyOnWriteArrayList<Map<String, Object>>();
	protected Map<String, String> params = new LinkedHashMap<String, String>();

	public AbstractSocket() {
		final Socket socket = this;

		socket.on("open", new Socket.EventHandler<Object>() {
			@Override
			public void handle(Object data) {
				if (!buffer.isEmpty()) {
					try {
						transmit(new Gson().toJson(buffer));
						buffer.clear();
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
				}
			}
		})
		.on("open", new Socket.EventHandler<Object>() {
			private long heartbeat;
			private Timer heartbeatTimer;

			@Override
			public void handle(Object data) {
				try {
					heartbeat = new Long(params.get("heartbeat"));
					setHeartbeatTimer();
					
					socket.on("heartbeat", new Socket.EventHandler<Object>() {
						@Override
						public void handle(Object data) {
							heartbeatTimer.cancel();
							setHeartbeatTimer();
							send("heartbeat", null);
						}
					})
					.on("close", new Socket.EventHandler<Object>() {
						@Override
						public void handle(Object data) {
							heartbeatTimer.cancel();
						}
					});
				} catch (NumberFormatException e) {
				}
			}

			private void setHeartbeatTimer() {
				heartbeatTimer = new Timer();
				heartbeatTimer.schedule(new TimerTask() {
					@Override
					public void run() {
						close();
					}
				}, heartbeat);
			}
		});
	}
	
	@Override
	public String id() {
		return params.get("id");
	}

	@Override
	@SuppressWarnings("rawtypes")
	public Socket on(String type, EventHandler handler) {
		if (!events.containsKey(type)) {
			events.put(type, new ConcurrentLinkedQueue<Socket.EventHandler>());
		}

		events.get(type).add(handler);

		return this;
	}

	@Override
	@SuppressWarnings("rawtypes")
	public Socket off(String type, EventHandler handler) {
		if (events.containsKey(type)) {
			events.get(type).remove(handler);
		}

		return this;
	}

	@Override
	@SuppressWarnings("rawtypes")
	public Socket one(final String type, final EventHandler handler) {
		return on(type, new Socket.EventHandler<Object>() {
			@Override
			@SuppressWarnings("unchecked")
			public void handle(Object data) {
				handler.handle(data);
				off(type, this);
			}
		});
	}

	@Override
	@SuppressWarnings({ "rawtypes", "unchecked" })
	public Socket fire(String type, Object data) {
		if (events.containsKey(type)) {
			for (EventHandler handler : events.get(type)) {
				handler.handle(data);
			}
		}

		return this;
	}

	@Override
	public Socket send(Object data) {
		return send("message", data);
	}
	
	@Override
	public Socket send(String type, Object data) {
		Map<String, Object> event = new LinkedHashMap<String, Object>();
		event.put("type", type);
		event.put("data", data);
		
		if (sendable()) {
			try {
				transmit(new Gson().toJson(event));
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
		} else {
			buffer.add(event);
		}
		
		return this;
	}
	
	protected abstract boolean sendable();
	
	protected abstract void transmit(String data) throws IOException;
	
	@Override
	public String toString() {
		return id();
	}

}
