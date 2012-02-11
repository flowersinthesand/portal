package org.flowersinthesand.jquerysocket.test;

import javax.servlet.annotation.WebInitParam;
import javax.servlet.annotation.WebServlet;

import org.flowersinthesand.jquerysocket.DispatcherServlet;

@WebServlet(
	urlPatterns = "/echo", 
	asyncSupported = true, 
	initParams = { 
		@WebInitParam(name = "maxTextMessageSize", value = "65536") 
	}
)
public class EchoServlet extends DispatcherServlet {

	private static final long serialVersionUID = -5077489814483500300L;

}