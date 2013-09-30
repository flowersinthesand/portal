/*
 * Copyright 2011-2013 Donghwan Kim
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.github.flowersinthesand.test;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.github.flowersinthesand.portal.Bean;
import com.github.flowersinthesand.portal.Data;
import com.github.flowersinthesand.portal.On;
import com.github.flowersinthesand.portal.Reply;
import com.github.flowersinthesand.portal.Socket;

@Bean
public class EchoHandler {

	private ScheduledExecutorService service = Executors.newSingleThreadScheduledExecutor();

	@On
	public void open(final Socket socket) {
		String close = socket.param("close");
		if (close != null) {
			service.schedule(new Runnable() {
				@Override
				public void run() {
					socket.close();
				}
			}, Long.valueOf(close), TimeUnit.MILLISECONDS);
		}

		String firstMessage = socket.param("firstMessage");
		if (firstMessage != null) {
			socket.send("message", "hello");
		}
	}

	@On
	public void message(Socket socket, @Data String data) {
		socket.send("message", data);
	}

	@On
	public void timestamp(@Reply Reply.Fn reply) {
		reply.done(System.currentTimeMillis());
	}

}
