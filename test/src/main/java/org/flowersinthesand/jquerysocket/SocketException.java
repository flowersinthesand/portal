package org.flowersinthesand.jquerysocket;

public class SocketException extends RuntimeException {

	private static final long serialVersionUID = -4864828542013575187L;

	private Object data;

	public SocketException(Object data) {
		this.data = data;
	}

	public Object data() {
		return data;
	}

}