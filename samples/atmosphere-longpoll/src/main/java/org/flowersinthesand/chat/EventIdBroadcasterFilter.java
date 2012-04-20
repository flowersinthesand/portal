package org.flowersinthesand.chat;

import java.util.concurrent.atomic.AtomicLong;

import org.atmosphere.cpr.BroadcastFilter;

public class EventIdBroadcasterFilter implements BroadcastFilter {

	private AtomicLong id = new AtomicLong();

	@Override
	public BroadcastAction filter(Object originalMessage, Object message) {
		if (message instanceof SocketEvent) {
			((SocketEvent) message).setId(id.incrementAndGet());
		}

		return new BroadcastAction(message);
	}

}