/*
 * Copyright 2012-2013 Donghwan Kim
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
package com.github.flowersinthesand.portal.support;

import java.io.IOException;
import java.nio.CharBuffer;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.flowersinthesand.portal.Reply;
import com.github.flowersinthesand.portal.Socket;
import com.github.flowersinthesand.portal.Wire;
import com.github.flowersinthesand.portal.spi.Dispatcher;
import com.github.flowersinthesand.portal.spi.SocketFactory;

public abstract class AbstractSocketFactory implements SocketFactory {

	protected static final String padding2K = CharBuffer.allocate(2048).toString().replace('\0', ' ');

	private final Logger logger = LoggerFactory.getLogger(AbstractSocketFactory.class);
	protected ConcurrentMap<String, Socket> sockets = new ConcurrentHashMap<String, Socket>();
	protected ObjectMapper mapper = new ObjectMapper();
	@Wire
	protected Dispatcher dispatcher;
	@Wire
	protected ReplyHandler replyHandler;

	public void abort(String id) {
		if (sockets.containsKey(id)) {
			sockets.get(id).close();
		}
	}

	public void fire(String raw) {
		Map<String, Object> m;
		try {
			m = mapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
		} catch (IOException e) {
			throw new RuntimeException(e);
		}
		logger.info("Receiving an event {}", m);
		dispatcher.fire((String) m.get("type"), sockets.get(m.get("socket")), m.get("data"), (Boolean) m.get("reply") ? (Integer) m.get("id") : 0);
	}

	public static Map<String, String> noCacheHeader() {
		Map<String, String> headers = new LinkedHashMap<String, String>();
		headers.put("Expires", "-1");
		headers.put("Cache-Control", "no-store, no-cache, must-revalidate");
		headers.put("Pragma", "no-cache");
		return headers;
	}

	public static Map<String, String> corsHeader(String origin) {
		Map<String, String> headers = new LinkedHashMap<String, String>();
		headers.put("Access-Control-Allow-Origin", origin != null ? origin : "*");
		headers.put("Access-Control-Allow-Credentials", "true");
		return headers;
	}

	protected abstract class AbstractSocket implements Socket {

		private final Logger logger = LoggerFactory.getLogger(AbstractSocket.class);
		private AtomicBoolean opened = new AtomicBoolean(false);
		protected boolean isAndroid;
		protected Map<String, String> params;
		protected ObjectMapper mapper = new ObjectMapper();
		protected AtomicInteger eventId = new AtomicInteger();
		protected Set<Map<String, Object>> cache = new CopyOnWriteArraySet<Map<String, Object>>();

		@Override
		public String id() {
			return params.get("id");
		}

		@Override
		public String param(String key) {
			return params.get(key);
		}
		
		@Override
		public boolean opened() {
			return opened.get();
		}
		
		@Override
		public Socket send(String event) {
			doSend(event, null, false);
			return this;
		}

		@Override
		public Socket send(String event, Object data) {
			doSend(event, data, false);
			return this;
		}

		@Override
		public Socket send(String event, Object data, Reply.Fn reply) {
			doSend(event, data, true);
			replyHandler.set(id(), eventId.get(), reply);
			return this;
		}

		protected void doSend(String type, Object data, boolean reply) {
			Map<String, Object> message = new LinkedHashMap<String, Object>();

			message.put("id", eventId.incrementAndGet());
			message.put("type", type);
			message.put("data", data);
			message.put("reply", reply);

			logger.info("Socket#{} is sending an event {}", id(), message);
			if (param("transport").startsWith("longpoll")) {
				cache.add(message);
			}
			transmit(format(message));
		}

		protected String format(Object message) {
			StringBuilder builder = new StringBuilder();
			String transport = param("transport");
			String data;
			try {
				data = mapper.writeValueAsString(message);
			} catch (Exception e) {
				throw new RuntimeException(e);
			}
			logger.debug("Formatting data {} for {} transport", data, transport);

			if (transport.equals("ws")) {
				builder.append(data);
			} else if (transport.equals("sse") || transport.startsWith("stream")) {
				if (isAndroid) {
					builder.append(padding2K).append(padding2K);
				}
				for (String datum : data.split("\r\n|\r|\n")) {
					builder.append("data: ").append(datum).append("\n");
				}
				builder.append("\n");
			} else if (transport.startsWith("longpoll")) {
				if (transport.equals("longpolljsonp")) {
					try {
						builder.append(param("callback")).append("(").append(mapper.writeValueAsString(data)).append(");");
					} catch (Exception e) {
						throw new RuntimeException(e);
					}
				} else {
					builder.append(data);
				}
			}

			return builder.toString();
		}

		@Override
		public Socket close() {
			logger.info("Closing socket#{}", id());
			disconnect();
			return this;
		}

		public void onOpen() {
			if (opened.compareAndSet(false, true)) {
				logger.info("Socket#{} has been opened, params: {}", id(), params);
				dispatcher.fire("open", this);
			}
		}

		public void onClose() {
			if (opened.compareAndSet(true, false)) {
				logger.info("Socket#{} has been closed", id());
				dispatcher.fire("close", sockets.remove(id()));
			}
		}

		protected Map<String, String> params(Map<String, String[]> params) {
			Map<String, String> map = new LinkedHashMap<String, String>(params.size());
			for (Entry<String, String[]> entry : params.entrySet()) {
				map.put(entry.getKey(), entry.getValue()[0]);
			}

			return map;
		}

		protected boolean isAndroid(String userAgent) {
			return userAgent != null && userAgent.matches(".*Android\\s[23]\\..*");
		}

		protected void retrieveCache(String lastEventIdsString) {
			if (lastEventIdsString == null) {
				return;
			}

			List<String> lastEventIds = Arrays.asList(lastEventIdsString.split(","));
			for (String eventId : lastEventIds) {
				for (Map<String, Object> message : cache) {
					if (eventId.equals(message.get("id").toString())) {
						cache.remove(message);
					}
				}
			}

			if (!cache.isEmpty()) {
				logger.debug("With the last event ids {}, flushing cached messages {}", lastEventIds, cache);
				transmit(format(cache));
			}
		}
		
		protected String streamContentType() {
			return "text/" + ("sse".equals(param("transport")) ? "event-stream" : "plain");
		}
		
		protected String longpollContentType() {
			return "text/" + ("longpolljsonp".equals(param("transport")) ? "javascript" : "plain");
		}

		abstract protected void transmit(String it);

		abstract protected void disconnect();

	}

}
