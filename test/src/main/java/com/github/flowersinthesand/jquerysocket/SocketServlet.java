package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@SuppressWarnings("serial")
public abstract class SocketServlet extends HttpServlet implements SocketAcceptor {
	
	protected Sockets sockets = new Sockets();
	
	@Override
	public void init() throws ServletException {
		sockets.setAcceptor(this);
	}
	
	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		if (sockets.has(request.getParameter("id"))) {
			Socket socket = sockets.get(request.getParameter("id")) ;
			socket.data().put("request", request);
			socket.data().put("response", response);
			socket.open();
			return;
		}
		
		final Socket socket = new ServletSocket();
		socket.data().put("request", request);
		socket.data().put("response", response);
		socket.open();
		
		sockets.add(socket);
	}
	
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		response.setHeader("Access-Control-Allow-Origin", "*");

		String json = request.getReader().readLine().substring("data=".length());
		Map<String, Object> event = new Gson().fromJson(json, new TypeToken<Map<String, Object>>() {}.getType());
		
		if (sockets.has((String) event.get("socket"))) {
			sockets.get((String) event.get("socket")).fire((String) event.get("type"), event.get("data"));
		}
	}
	
}
