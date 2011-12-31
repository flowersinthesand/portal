package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;

@WebServlet(urlPatterns = "/test/ws", asyncSupported = true)
public class EchoWebSocketServlet extends WebSocketServlet {

	private static final long serialVersionUID = 4437311371784508862L;

	@Override
	public WebSocket doWebSocketConnect(final HttpServletRequest request, String protocol) {
		return new WebSocket.OnTextMessage() {

			Connection connection;

			@Override
			public void onOpen(Connection c) {
				this.connection = c;
				connection.setMaxTextMessageSize(65536);

				if (Boolean.valueOf(request.getParameter("close"))) {
					new Timer().schedule(new TimerTask() {
						@Override
						public void run() {
							connection.close();
						}
					}, 1000);
				}
			}

			@Override
			public void onClose(int code, String reason) {
			}

			@Override
			public void onMessage(String json) {
				Event event = new Event().parse(json);
				try {
					connection.sendMessage(event.stringify());
				} catch (IOException e) {
					throw new RuntimeException(e);
				}
			}
		};
	}

}