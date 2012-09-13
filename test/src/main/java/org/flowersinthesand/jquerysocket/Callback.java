package org.flowersinthesand.jquerysocket;

public interface Callback<T> {
	void execute(T data);
}