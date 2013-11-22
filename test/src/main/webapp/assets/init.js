var original = $.extend(true, {}, portal);

function moduleSetup() {
	$.extend(portal.defaults, {
		sharing: false,
		transports: ["dummy"]
	});
}

function moduleTeardown() {
	portal.finalize();
	
	var i, j;
	
	for (i in {defaults: 1, transports: 1}) {
		for (j in portal[i]) {
			delete portal[i][j];
		}
		
		$.extend(true, portal[i], original[i]);
	}
}

function okTrue() {
	ok(true);
}

function okFalse() {
	ok(false);
}

QUnit.config.testTimeout = 10000;