package com.github.flowersinthesand.test;

import java.util.Timer;
import java.util.TimerTask;

import com.github.flowersinthesand.portal.Data;
import com.github.flowersinthesand.portal.Fn;
import com.github.flowersinthesand.portal.Handler;
import com.github.flowersinthesand.portal.On;
import com.github.flowersinthesand.portal.Reply;
import com.github.flowersinthesand.portal.Socket;

@Handler("/echo")
public class EchoHandler {

	@On.open
	public void open(final Socket socket) {
		String close = socket.param("close");
		if (close != null) {
			new Timer().schedule(new TimerTask() {
				@Override
				public void run() {
					socket.close();
				}
			}, Long.valueOf(close));
		}

		String firstMessage = socket.param("firstMessage");
		if (firstMessage != null) {
			socket.send("message", "hello");
		}
	}

	@On.message
	public void message(Socket socket, @Data String data) {
		socket.send("message", data);
	}

	@On("timestamp")
	public void timestamp(@Reply Fn.Callback1<Long> reply) {
		reply.call(System.currentTimeMillis());
	}

}
