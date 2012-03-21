package org.flowersinthesand.chat;

import javax.servlet.annotation.WebServlet;

import org.flowersinthesand.jquerysocket.DispatcherServlet;

@WebServlet(urlPatterns = "/chat", asyncSupported = true)
public class ChatServlet extends DispatcherServlet {

	private static final long serialVersionUID = -5205870544406759419L;

}