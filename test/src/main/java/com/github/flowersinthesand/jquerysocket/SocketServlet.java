package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@SuppressWarnings("serial")
public abstract class SocketServlet extends HttpServlet {

	protected ConcurrentMap<String, Socket> sockets = new ConcurrentHashMap<String, Socket>();

	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		boolean pollIntermission = sockets.containsKey(request.getParameter("id"));
		
		final ServletSocket socket = pollIntermission ? (ServletSocket) sockets.get(request.getParameter("id")) : new ServletSocket();
		socket.setRequest(request);
		socket.setResponse(response);
		socket.open();
		
		if (pollIntermission) {
			return;
		}
		
		sockets.put(socket.id(), socket.on("close", new Socket.EventHandler<Object>() {
			@Override
			public void handle(Object data) {
				sockets.remove(socket.id());
			}
		}));
		doSocketConnect(request, socket);
	}
	
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		response.setHeader("Access-Control-Allow-Origin", "*");

		String json = request.getReader().readLine().substring("data=".length());
		Map<String, Object> event = new Gson().fromJson(json, new TypeToken<Map<String, Object>>() {}.getType());
		
		if (sockets.containsKey(event.get("socket"))) {
			sockets.get(event.get("socket")).fire((String) event.get("type"), event.get("data"));
		}
	}
	
	public abstract void doSocketConnect(HttpServletRequest request, Socket socket);
	
}
