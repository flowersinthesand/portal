package org.flowersinthesand.chat;

import java.util.LinkedHashMap;
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
		String username = connection.data().get("transport") + "-" + connection.data().get("id").toString().substring(0, 8);
		connection.data().put("username", username);

		for (Connection conn : connections.values()) {
			if (connection != conn) {
				conn.send("entrance", username);
			}
		}
	}

	@On("init")
	public Map<String, Object> init() {
		Map<String, Object> map = new LinkedHashMap<String, Object>();
		map.put("username", connection.data().get("username"));

		return map;
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

	@On("message")
	public void message() {
		for (Connection conn : connections.values()) {
			conn.send(data);
		}
	}

}
