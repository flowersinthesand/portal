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

public class SocketEvent {

	private String socket;
	private String type;
	private Object data;

	public SocketEvent(String type) {
		this.type = type;
	}

	public String getType() {
		return type;
	}

	public Object getData() {
		return data;
	}

	public SocketEvent setData(Object data) {
		this.data = data;
		return this;
	}

	public String getSocket() {
		return socket;
	}

	public SocketEvent setSocket(String socket) {
		this.socket = socket;
		return this;
	}

}