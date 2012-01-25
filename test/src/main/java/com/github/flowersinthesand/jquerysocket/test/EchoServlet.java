package com.github.flowersinthesand.jquerysocket.test;

import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.annotation.WebInitParam;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;

import com.github.flowersinthesand.jquerysocket.JettySocketServlet;
import com.github.flowersinthesand.jquerysocket.Socket;

@WebServlet(
	urlPatterns = "/echo", 
	asyncSupported = true, 
	initParams = { 
		@WebInitParam(name = "maxTextMessageSize", value = "65536") 
	}
)
public class EchoServlet extends JettySocketServlet {

	private static final long serialVersionUID = 4437311371784508862L;

	@Override
	public void doSocketConnect(final Socket socket) {
		socket.on("message", new Socket.EventHandler<Object>() {
			@Override
			public void handle(Object data) {
				socket.send(data);
			}
		});

		HttpServletRequest request = (HttpServletRequest) socket.data().get("request");
		if (Boolean.valueOf(request.getParameter("close"))) {
			new Timer().schedule(new TimerTask() {
				@Override
				public void run() {
					socket.close();
				}
			}, 1000);
		}
	}

}