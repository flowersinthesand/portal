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