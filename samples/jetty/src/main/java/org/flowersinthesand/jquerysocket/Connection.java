package org.flowersinthesand.jquerysocket;

import java.util.Map;

//Interface to blur the differences between the different transport mechanisms
public interface Connection {

	// Sends a message event
	void send(Object data);

	// Sends a custom event
	void send(String event, Object data);

	// Sends a message event and requires a reply
	void sendWithCallback(Object data, Callback<?> callback);

	// Sends a custom event requires a reply
	void sendWithCallback(String event, Object data, Callback<?> callback);

	// Closes the connection
	void close();

	// Properties
	Map<String, Object> data();

	// Callback interface
	interface Callback<T> {
		void execute(T data);
	}

}