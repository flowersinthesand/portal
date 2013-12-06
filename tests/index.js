// The index.js tests portal.js as a Node.js client and requires alive portal server
// and requires a running portal server
// 
// To run portal server, execute the command in another console
//     cd test 
//     mvn clean package jetty:run-war

var qunit = require("qunit");

qunit.run({
	deps: {path: "test/src/main/webapp/assets/helper.js", namespace: "helper"},
	code: {path: "portal.js", namespace: "portal"},
	tests: ["test/src/main/webapp/client.js", "test/src/main/webapp/server.js"]
});