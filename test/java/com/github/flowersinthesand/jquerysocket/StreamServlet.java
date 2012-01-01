package com.github.flowersinthesand.jquerysocket;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Arrays;
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

@WebServlet(urlPatterns = { "/test/stream", "/test/sse" }, asyncSupported = true)
public class StreamServlet extends HttpServlet {

	private static final long serialVersionUID = -1896457417378814518L;

	private Map<String, AsyncContext> asyncContexts = new ConcurrentHashMap<String, AsyncContext>();

	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");
		response.setContentType("text/"
				+ ("sse".equals(request.getParameter("transport")) ? "event-stream" : "plain"));
		response.setHeader("Access-Control-Allow-Origin", "*");

		final PrintWriter writer = response.getWriter();
		writer.println(Arrays.toString(new float[400]).replaceAll(".", " "));
		writer.flush();

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

		Event event = new Event().parse(request.getReader().readLine());
		AsyncContext ac = asyncContexts.get(event.socket);
		if (ac != null) {
			PrintWriter writer = ac.getResponse().getWriter();
			writer.println(format(event.stringify()));
			writer.flush();
		}
	}

	private String format(String string) {
		StringBuilder builder = new StringBuilder();

		for (String data : string.split("\r\n|\r|\n")) {
			builder.append("data: ").append(data).append("\n");
		}

		return builder.toString();
	}

}