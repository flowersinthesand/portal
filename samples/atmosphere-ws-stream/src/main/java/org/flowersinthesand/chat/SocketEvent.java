package org.flowersinthesand.chat;

public class SocketEvent {

	private String socket;
	private String type;
	private Object data;

	public SocketEvent(String type) {
		this.type = type;
	}

	public String getType() {
		return type;
	}

	public Object getData() {
		return data;
	}

	public SocketEvent setData(Object data) {
		this.data = data;
		return this;
	}

	public String getSocket() {
		return socket;
	}

	public SocketEvent setSocket(String socket) {
		this.socket = socket;
		return this;
	}

}