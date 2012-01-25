package com.github.flowersinthesand.jquerysocket;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class Sockets {

	private SocketAcceptor acceptor;
	private Map<String, Socket> instances = new ConcurrentHashMap<String, Socket>();

	public void add(final Socket socket) {
		instances.put(socket.id(), socket.on("close", new Socket.EventHandler<Object>() {
			@Override
			public void handle(Object data) {
				instances.remove(socket.id());
			}
		}));
		acceptor.doSocketConnect(socket);
	}

	public boolean has(String id) {
		return instances.containsKey(id);
	}

	public Socket get(String id) {
		return instances.get(id);
	}
	
	public List<Socket> getAll() {
		return new ArrayList<Socket>(instances.values());
	}

	public void remove(String id) {
		instances.remove(id);
	}

	public Map<String, Socket> getMap() {
		return instances;
	}

	public void setAcceptor(SocketAcceptor acceptor) {
		this.acceptor = acceptor;
	}

}
