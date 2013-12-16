// The index.js tests portal.js as a Node.js client and 
// requires a running portal server
// 
// To run portal server, execute the command in another console
//     node server

var qunit = require("qunit");

qunit.run({
	deps: {path: "webapp/assets/helper.js", namespace: "helper"},
	code: {path: "../portal.js", namespace: "portal"},
	tests: ["webapp/client.js", "webapp/server.js"]
});
