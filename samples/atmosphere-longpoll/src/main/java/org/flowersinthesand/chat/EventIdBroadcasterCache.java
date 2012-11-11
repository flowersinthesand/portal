/*
 * Copyright 2012 Donghwan Kim
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