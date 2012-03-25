package org.flowersinthesand.test;

import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

import org.flowersinthesand.jquerysocket.Connection;
import org.flowersinthesand.jquerysocket.EventHandler;
import org.flowersinthesand.jquerysocket.On;

@EventHandler("/echo")
public class EchoHandler {

	private Connection connection;
	private Object data;

	@On("open")
	public void execute() {
		@SuppressWarnings("unchecked")
		Map<String, String[]> params = (Map<String, String[]>) connection.data().get("parameters");
		if (params.containsKey("close") && Boolean.valueOf(params.get("close")[0])) {
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
