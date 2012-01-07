package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;

@WebServlet(urlPatterns = "/test/longpoll", asyncSupported = true)
public class LongPollServlet extends HttpServlet {

	private static final long serialVersionUID = 6086040891642945979L;

	private Map<String, AsyncContext> asyncContexts = new ConcurrentHashMap<String, AsyncContext>();

	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");
		response.setContentType("text/"
				+ ("longpolljsonp".equals(request.getParameter("transport")) ? "javascript"
						: "plain"));
		response.setHeader("Access-Control-Allow-Origin", "*");

		final String id = request.getParameter("id");
		final AsyncContext ac = request.startAsync();
		ac.addListener(new AsyncListener() {
			public void onComplete(AsyncEvent event) throws IOException {
				asyncContexts.remove(id);
			}

			public void onTimeout(AsyncEvent event) throws IOException {
				asyncContexts.remove(id);
			}

			public void onError(AsyncEvent event) throws IOException {
				asyncContexts.remove(id);
			}

			public void onStartAsync(AsyncEvent event) throws IOException {

			}
		});
		asyncContexts.put(id, ac);

		if (Boolean.valueOf(request.getParameter("close"))) {
			new Timer().schedule(new TimerTask() {
				@Override
				public void run() {
					ac.complete();
				}
			}, 1000);
		}
	}

	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setHeader("Access-Control-Allow-Origin", "*");

		final Event event = new Event().parse(request.getReader().readLine());

		// Just for test
		new Timer().schedule(new TimerTask() {
			@Override
			public void run() {
				try {
					AsyncContext ac = asyncContexts.get(event.socket);
					if (ac != null) {
						PrintWriter writer = ac.getResponse().getWriter();
						writer.print(format(event.stringify(), ac.getRequest().getParameterMap()));
						writer.flush();
						ac.complete();
					}
				} catch (IOException e) {
					throw new RuntimeException(e);
				}
			}
		}, 100);
	}

	private String format(String string, Map<String, String[]> params) {
		if ("longpollxhr".equals(params.get("transport")[0])) {
			return string;
		}

		return params.get("callback")[0] + "(" + new Gson().toJson(string).toString() + ")";
	}

}
