package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.github.flowersinthesand.jquerysocket.servlet.Connection;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@WebServlet(urlPatterns = "/http", asyncSupported = true)
public class EchoHttpServlet extends HttpServlet {

	private static final long serialVersionUID = -1896457417378814518L;

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
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");

		Map<String, Object> event = new Gson().fromJson(request.getReader().readLine(), new TypeToken<Map<String, Object>>() {}.getType());
		Connection connection = Connection.find((String) event.get("socket"));
		if (event.get("type").equals("heartbeat")) {
			connection.resetHeartbeatTimer();
			connection.send("heartbeat", null);
			return;
		}
		
		connection.send((String) event.get("type"), event.get("data"));
	}

}