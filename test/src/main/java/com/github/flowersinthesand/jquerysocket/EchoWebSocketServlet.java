package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@WebServlet(urlPatterns = "/ws", asyncSupported = true)
public class EchoWebSocketServlet extends WebSocketServlet {

	private static final long serialVersionUID = 4437311371784508862L;

	@Override
	public WebSocket doWebSocketConnect(final HttpServletRequest request, String protocol) {
		final long heartbeat = parseLong(request.getParameter("heartbeat"));
		
		return new WebSocket.OnTextMessage() {

			Connection connection;
			Timer heartbeatTimer;

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
				Map<String, Object> requestEvent = new Gson().fromJson(json, new TypeToken<Map<String, Object>>() {}.getType());
				if (requestEvent.get("type").equals("heartbeat")) {
					resetHeartbeatTimer();
					try {
						connection.sendMessage("{\"type\":\"heartbeat\"}");
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
					return;
				}
				
				Map<String, Object> responseEvent = new LinkedHashMap<String, Object>();
				responseEvent.put("type", requestEvent.get("type"));
				responseEvent.put("data", requestEvent.get("data"));
				
				try {
					connection.sendMessage(new Gson().toJson(responseEvent));
				} catch (IOException e) {
					throw new RuntimeException(e);
				}
			}
			
			private void resetHeartbeatTimer() {
				if (heartbeatTimer != null) {
					heartbeatTimer.cancel();
				}
				
				heartbeatTimer = new Timer();
				heartbeatTimer.schedule(new TimerTask() {
					@Override
					public void run() {
						connection.close();
					}
				}, heartbeat);
			}
		};
	}
	
	private long parseLong(String string) {
		try {
			return new Long(string);
		} catch (NumberFormatException e) {
			return 0;
		}
	}

}