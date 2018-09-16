Math.clamp = (value, min, max) => value > min ? (value < max ? value: max) : min;
Math.lerp  = (v0, v1, t) => v0 * (1 - t) + v1 * t;
Array.prototype.last = function() {return this[this.length - 1];};

function cloneCanvas(oldCanvas) {
	var newCanvas = createCanvasOfDimensions(oldCanvas.width, oldCanvas.height);
	newCanvas.context.drawImage(oldCanvas, 0, 0);
	return newCanvas;
}

const createCanvasOfDimensions = function(width, height) {
	var canvas   = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.context = canvas.getContext("2d");
	canvas.context.imagedata = canvas.context.getImageData(0, 0, canvas.width, canvas.height); // Must trust this to always be there.
	return canvas;
}
