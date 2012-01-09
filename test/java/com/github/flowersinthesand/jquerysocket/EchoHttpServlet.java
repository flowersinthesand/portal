package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.github.flowersinthesand.jquerysocket.servlet.Connection;

@WebServlet(urlPatterns = { "/test/stream", "/test/sse", "/test/longpoll" }, asyncSupported = true)
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
					try {
						connection.close();
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
				}
			}, 1000);
		}
	}

	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");

		Event event = new Event().parse(request.getReader().readLine());
		Connection.find(event.socket).send(event.stringify());
	}

}