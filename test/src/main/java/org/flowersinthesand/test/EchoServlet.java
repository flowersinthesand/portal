package org.flowersinthesand.test;

import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

import javax.servlet.annotation.WebInitParam;
import javax.servlet.annotation.WebServlet;

import org.flowersinthesand.jquerysocket.Connection;
import org.flowersinthesand.jquerysocket.jetty.DispatcherServlet;

@WebServlet(
	urlPatterns = "/echo", 
	asyncSupported = true, 
	initParams = { 
		@WebInitParam(name = "maxTextMessageSize", value = "65536") 
	}
)
public class EchoServlet extends DispatcherServlet {

	private static final long serialVersionUID = -5077489814483500300L;

	@Override
	public Object handle(String id, String type, Object data) {
		final Connection connection = getConnections().get(id);
		
		if (type.equals("open")) {
			@SuppressWarnings("unchecked")
			Map<String, String[]> params = (Map<String, String[]>) connection.data().get("parameters");
			if (params.containsKey("close")) {
				new Timer().schedule(new TimerTask() {
					@Override
					public void run() {
						connection.close();
					}
				}, Long.valueOf(params.get("close")[0]));
			} else if (params.containsKey("firstMessage")) {
				connection.send("hello");
			}
		} else if (type.equals("message")) {
			connection.send(data);
		}

		return null;
	}

}