package org.flowersinthesand.portal;

public interface Callback<T> {
	void execute(T data);
}