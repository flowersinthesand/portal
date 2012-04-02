package org.flowersinthesand.chat;

import java.util.Map;

import javax.servlet.annotation.WebServlet;

import org.flowersinthesand.jquerysocket.Connection;
import org.flowersinthesand.jquerysocket.jetty.DispatcherServlet;

@WebServlet(urlPatterns = "/chat", asyncSupported = true)
public class ChatServlet extends DispatcherServlet {

	private static final long serialVersionUID = -5205870544406759419L;
	
	@Override
	public Object handle(String id, String type, Object data) {
		final Connection connection = getConnections().get(id);
		
		if (type.equals("open")) {
			@SuppressWarnings("unchecked")
			String username = ((Map<String, String[]>) connection.data().get("parameters")).get("username")[0];
			connection.data().put("username", username);

			for (Connection conn : getConnections().values()) {
				if (connection != conn) {
					conn.send("entrance", username);
				}
			}
		} else if (type.equals("message")) {
			for (Connection conn : getConnections().values()) {
				conn.send(data);
			}
		} else if (type.equals("close")) {
			String username = (String) connection.data().get("username");
			for (Connection conn : getConnections().values()) {
				if (connection != conn) {
					conn.send("exit", username);
				}
			}
		}
		
		return null;
	}

}