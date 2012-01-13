package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;

import com.github.flowersinthesand.jquerysocket.servlet.Connection;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@WebServlet(urlPatterns = "/echo", asyncSupported = true)
public class EchoServlet extends WebSocketServlet {

	private static final long serialVersionUID = 4437311371784508862L;

	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");

		final Connection connection = Connection.find(request.getParameter("id"));
		connection.setAsyncContext(request.startAsync());

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
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		response.setHeader("Access-Control-Allow-Origin", "*");
		
		String data = request.getReader().readLine().substring("data=".length());
		Map<String, Object> event = new Gson().fromJson(data, new TypeToken<Map<String, Object>>() {}.getType());
		Connection connection = Connection.find((String) event.get("socket"));
		if (event.get("type").equals("heartbeat")) {
			connection.resetHeartbeatTimer();
			connection.send("heartbeat", null);
			return;
		}
		
		connection.send((String) event.get("type"), event.get("data"));
	}
	
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