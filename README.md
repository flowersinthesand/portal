# Portal
The **Portal** is a concise, lightweight and feature-rich JavaScript library for real-time web application development. The <strong>Portal</strong> provides socket for browser-based and Node.js-based applications that need two-way communication with servers, but also aims to utilize a full duplex connection for modern web application development.

The **Portal** greatly simplifies things essential to real-time web applications like connection sharing, reply, heartbeat and disconnection detection. The <strong>Portal</strong> is designed by carefully considering known issues and best practices of real-time web to provide a reliable socket based on its simple protocol.

* Website: http://flowersinthesand.github.io/portal/
* Twitter: http://twitter.com/flowersits
* Mailing list: https://groups.google.com/d/forum/portal_project

## Test suite

Since this project follows Test Driven Development (TDD) principles well, looking at and running the test suite is a best way to understand the portal deeply. Every test has a title specifying a single behavior and is wrriten in QUnit.

* [`client.js`](https://github.com/flowersinthesand/portal/blob/master/test/webapp/client.js): Tests portal and socket using dummy and mock transport.
* [`server.js`](https://github.com/flowersinthesand/portal/blob/master/test/webapp/server.js): Tests transport by interacting with portal server, a very server passing the test suite. 

### Running

In order to run test suite, you need to have Node.js.

Clone this repository or simply download it as a zip and extract it.

```bash
git clone https://github.com/flowersinthesand/portal.git
cd portal
```

Install dependencies. If you are on Windows, you may have trouble in installing Contextify. See a [installation guide](https://github.com/tmpvar/jsdom#contextify) from jsdom.

```bash
npm install
```

Start a server on localhost at port 8080.

```bash
node test/server
```

To test portal.js as a browser client, open a browser to test and connect to http://localhost:8080. To test it as a Node.js client, type `node test/index` in other console and see the result.