const Sketchfull = {
	canvas: [],

	Init() {
		$(".dropdown-button").dropdown();
		$(".resizable").resizable();
		$(".draggable").draggable({handle: ".draggable-handle"});
		$(".colpick").colpick({
			color: "123456",
			flat: true,
			onChange:function(hsb,hex,rgb,el,bySetColor) {
				Sketchfull.canvas.context.beginPath();
				Sketchfull.canvas.context.strokeStyle = "#" + hex;
			}
		});

		Sketchfull.canvas = $("#sketch-canvas")[0];
		Sketchfull.canvas.width = Sketchfull.canvas.clientWidth;
		Sketchfull.canvas.height = Sketchfull.canvas.clientHeight;
		Sketchfull.canvas.isMouseDown = false;
		Sketchfull.canvas.context = Sketchfull.canvas.getContext("2d");
		Sketchfull.canvas.context.imageSmoothingEnabled = true;
		Sketchfull.canvas.context.strokeStyle = "#000000";
		Sketchfull.canvas.context.lineWidth = 5;
		Sketchfull.canvas.context.lineCap = "round";

		$(window).resize(Sketchfull.Clear);

		$("#sketch-thickness").on("change", e => {
			Sketchfull.canvas.context.beginPath();
			Sketchfull.canvas.context.lineWidth = e.target.value;
		});

		Sketchfull.canvas.addEventListener("mousedown", e => {
			Sketchfull.canvas.context.beginPath();
			Sketchfull.canvas.context.moveTo(e.offsetX, e.offsetY);
			Sketchfull.canvas.isMouseDown = true;
		});

		Sketchfull.canvas.addEventListener("touchstart", e => {
		});

		Sketchfull.canvas.addEventListener("mousemove", e => {
			if(Sketchfull.canvas.isMouseDown) {
				var xc = (e.offsetX - e.movementX + e.offsetX) / 2;
				var yc = (e.offsetY - e.movementY + e.offsetY) / 2;
				Sketchfull.canvas.context.quadraticCurveTo(e.offsetX - e.movementX, e.offsetY - e.movementY, xc, yc);
				Sketchfull.canvas.context.stroke(); // Remove for anti aliasing
			}
		});

		Sketchfull.canvas.addEventListener("touchmove", e => {
		});

		Sketchfull.canvas.addEventListener("mouseup", e => {
			Sketchfull.canvas.context.quadraticCurveTo(e.offsetX - e.movementX, e.offsetY - e.movementY, e.offsetX, e.offsetY);
			Sketchfull.canvas.context.stroke();
			Sketchfull.canvas.isMouseDown = false;
		});

		Sketchfull.canvas.addEventListener("touchend", e => {
		});
	},

	Clear() {
		Sketchfull.canvas.width = Sketchfull.canvas.height = 0; // Required for the canvas to shrink
		Sketchfull.canvas.width = Sketchfull.canvas.clientWidth;
		Sketchfull.canvas.height = Sketchfull.canvas.clientHeight;
	},

	Download(source) {
		source.download = "image.png";
		source.href = Sketchfull.canvas.toDataURL("image/png").replace(/^data:image\/[^;]/, 'data:application/octet-stream');
	}
};

// Lets go!
$(document).ready(Sketchfull.Init);