package com.github.flowersinthesand.jquerysocket;

import com.google.gson.Gson;

public class Event {

	public String type;
	public String socket;
	public Object data;

	public Event parse(String json) {
		Event event = new Gson().fromJson(json, getClass());
		this.type = event.type;
		this.socket = event.socket;
		this.data = event.data;

		return this;
	}

	public String stringify() {
		return new Gson().toJson(this);
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder().append("type: ").append(type);

		if (socket != null) {
			sb.append(", socket: ").append(socket);
		}
		if (data != null) {
			sb.append(", data: ").append(data);
		}

		return sb.toString();
	}
}
