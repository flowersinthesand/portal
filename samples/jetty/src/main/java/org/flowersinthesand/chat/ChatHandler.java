package org.flowersinthesand.chat;

import java.util.Map;

import org.flowersinthesand.jquerysocket.Connection;
import org.flowersinthesand.jquerysocket.EventHandler;
import org.flowersinthesand.jquerysocket.On;

@EventHandler("/chat")
public class ChatHandler {

	private Map<String, Connection> connections;
	private Connection connection;
	private Object data;

	@On("open")
	public void open() {
		@SuppressWarnings("unchecked")
		String username = ((Map<String, String[]>) connection.data().get("parameters")).get("username")[0];
		connection.data().put("username", username);

		for (Connection conn : connections.values()) {
			if (connection != conn) {
				conn.send("entrance", username);
			}
		}
	}

	@On("message")
	public void message() {
		for (Connection conn : connections.values()) {
			conn.send(data);
		}
	}

	@On("close")
	public void close() {
		String username = (String) connection.data().get("username");
		for (Connection conn : connections.values()) {
			if (connection != conn) {
				conn.send("exit", username);
			}
		}
	}

}
