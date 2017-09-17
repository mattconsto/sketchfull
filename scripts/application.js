const Sketchfull = {
	canvas: [],

	Init() {
		$(".dropdown-button").dropdown();

		Sketchfull.canvas = $("#sketch-canvas")[0];
		Sketchfull.canvas.width = Sketchfull.canvas.clientWidth;
		Sketchfull.canvas.height = Sketchfull.canvas.clientHeight;
		Sketchfull.canvas.isMouseDown = false;
		Sketchfull.canvas.context = Sketchfull.canvas.getContext("2d");
		Sketchfull.canvas.context.imageSmoothingEnabled = true;

		$(window).resize(function() {
			Sketchfull.canvas.width = Sketchfull.canvas.clientWidth;
			Sketchfull.canvas.height = 0; // Required for the canvas to shrink
			Sketchfull.canvas.height = Sketchfull.canvas.clientHeight;
		});

		Sketchfull.canvas.addEventListener("mousedown", e => {
			Sketchfull.canvas.context.moveTo(e.offsetX, e.offsetY);
			Sketchfull.canvas.isMouseDown = true;
		});

		Sketchfull.canvas.addEventListener("mousemove", e => {
			if(Sketchfull.canvas.isMouseDown) {
				var xc = (e.offsetX - e.movementX + e.offsetX) / 2;
				var yc = (e.offsetY - e.movementY + e.offsetY) / 2;
				Sketchfull.canvas.context.quadraticCurveTo(e.offsetX - e.movementX, e.offsetY - e.movementY, xc, yc);
				Sketchfull.canvas.context.stroke();
			}
		});

		Sketchfull.canvas.addEventListener("mouseup", e => {
			Sketchfull.canvas.context.quadraticCurveTo(e.offsetX - e.movementX, e.offsetY - e.movementY, e.offsetX, e.offsetY);
			Sketchfull.canvas.isMouseDown = false;
		});
	}
};

// Lets go!
$(document).ready(Sketchfull.Init);