(function() {
	$(document).foundation();
	$(".sidebar li a[href='" + location.pathname + "']").parent("li").addClass("active");
})();