// The index.js tests portal.js as a Node.js client and 
// requires a running portal server
// 
// To run portal server, execute the command in another console
//     node server

var qunit = require("qunit");

qunit.run({
	deps: {path: __dirname + "/webapp/assets/helper.js", namespace: "helper"},
	code: {path: __dirname + "/../portal.js", namespace: "portal"},
	tests: [__dirname + "/webapp/unit/client.js", __dirname + "/webapp/unit/server.js"]
});
