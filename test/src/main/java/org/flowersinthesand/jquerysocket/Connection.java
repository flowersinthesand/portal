package org.flowersinthesand.jquerysocket;

import java.util.Map;

public interface Connection {

	void send(Object data);

	void send(String event, Object data);

	void sendWithCallback(Object data, Callback<?> callback);

	void sendWithCallback(String event, Object data, Callback<?> callback);

	void close();

	Map<String, Object> data();

	interface Callback<T> {
		void execute(T data);
	}

}