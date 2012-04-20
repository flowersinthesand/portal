package org.flowersinthesand.chat;

import org.atmosphere.cache.BroadcasterCacheBase;
import org.atmosphere.cpr.AtmosphereResource;
import org.atmosphere.cpr.AtmosphereResourceImpl;

public class EventIdBroadcasterCache extends BroadcasterCacheBase {

	public void cache(AtmosphereResource resource, CachedMessage cm) {

	}

	public CachedMessage retrieveLastMessage(AtmosphereResource resource) {
		AtmosphereResourceImpl r = AtmosphereResourceImpl.class.cast(resource);

		if (!r.isInScope()) {
			return null;
		}

		return retrieveUsingEventId(r.getRequest().getParameter("lastEventId"));
	}

	private CachedMessage retrieveUsingEventId(String lastEventIdString) {
		if ("".equals(lastEventIdString)) {
			return null;
		}

		long lastEventId = Long.valueOf(lastEventIdString);
		CachedMessage prev = null;
		for (CachedMessage cm : queue) {
			if (((SocketEvent) cm.message()).getId() > lastEventId) {
				return prev;
			}

			prev = cm;
		}

		return prev;
	}

}