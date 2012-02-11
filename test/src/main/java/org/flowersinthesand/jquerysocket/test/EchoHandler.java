package org.flowersinthesand.jquerysocket.test;

import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.http.HttpServletRequest;

import org.flowersinthesand.jquerysocket.Connection;
import org.flowersinthesand.jquerysocket.EventHandler;
import org.flowersinthesand.jquerysocket.On;

@EventHandler("/echo")
public class EchoHandler {

	private Connection connection;
	private Object data;

	@On("open")
	public void execute() {
		HttpServletRequest request = (HttpServletRequest) connection.data().get("request");
		if (Boolean.valueOf(request.getParameter("close"))) {
			new Timer().schedule(new TimerTask() {
				@Override
				public void run() {
					connection.close();
				}
			}, 1000);
		}
	}

	@On("message")
	public void message() {
		connection.send(data);
	}

}
