Math.clamp = (value, min, max) => value > min ? (value < max ? value: max) : min;
Math.lerp  = (v0, v1, t) => v0 * (1 - t) + v1 * t;
Array.prototype.last = function() {return this[this.length - 1];};

const createCanvasOfDimensions = function(width, height) {
	var canvas   = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.context = canvas.getContext("2d");
	canvas.context.imagedata = canvas.context.getImageData(0, 0, canvas.width, canvas.height); // Must trust this to always be there.
	return canvas;
}

// Automatically compile simple templates
$("script.auto-component[type='text/ractive']").each((index, element) => {Ractive.components[element.id] = Ractive.extend({template: element.innerHTML, isolated: false})});

const Sketchfull = {
	canvas: [],
	layers: [
		{type: "bitmap", visible: true, name: "Layer 0", x: 0, y: 0, data: createCanvasOfDimensions(500, 500)}
	],
	layer: 0,
	tools: {
		undo: {

		},
		redo: {

		},
		move: {
			switch: true,
			toolbar: '<ul><li><span>Move</span></li></ul>',
			Move(layer, x0, y0, x1, y1) {
				layer.x += x1 - x0;
				layer.y += y1 - y0;
				Sketchfull.dirty = true;
			}
		},
		select: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Select</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		pick: {
			switch: true,
			options: {
				alllayers: false
			},
			toolbar: '<ul><li><span>Color Picker</span></li><li><input type="checkbox" id="sketch-tool-pick-alllayers" checked="unchecked" /><label for="sketch-tool-pick-alllayers">Sample all layers</label></li></ul>',
			Start(layer, x, y) {
				switch(layer.type) {
					case "bitmap":
						$(".colpick").colpickSetColor(Sketchfull.GetPixel(layer.data.context.imagedata, Math.round(x), Math.round(y)));
						break;
					case "text":
					case "line":
					case "rectangle":
					case "circle":
						$(".colpick").colpickSetColor(layer.data.color);
						break;
					default:
						console.warn("Cannot pick color");
				}
			},
			Move(layer, x0, y0, x1, y1) {
				this.Start(layer, x1, y1);
			}
		},
		erase: {

			switch: true,
			options: {
				thickness: 5,
				hardness: 0.75,
				opacity: 255,
			},
			toolbar: '<ul><li><span>Erase</span></li><li><span>Line Thickness</span></li><li><span class="range-field"><input type="range" id="sketch-thickness" min="1" max="250" /></span></li><li><span>Opacity</span></li><li><span class="range-field"><input type="range" id="sketch-opacity" min="0" max="255" /></span></li><li><span>Hardness</span></li><li><span class="range-field"><input type="range" id="sketch-hardness" min="0" max="100" /></span></li></ul>',
			Init() {
				$("#sketch-thickness").val(this.options.thickness);
				$("#sketch-thickness").on("change", e => {this.options.thickness = parseInt(e.target.value)});
				$("#sketch-opacity").val(this.options.opacity);
				$("#sketch-opacity").on("change", e => {this.options.opacity = parseInt(e.target.value)});
				$("#sketch-hardness").val(100 - this.options.hardness * 100);
				$("#sketch-hardness").on("change", e => {this.options.hardness = 1 - parseInt(e.target.value) / 100});
			},
			Start(layer, x, y) {
				var opacity = this.options.opacity;

				var circle = function(bitmap, x, y, r, hardness) {
					for(var i = -r; i < r; i++) {
						for(var j = -r; j < r; j++) {
							Sketchfull.MinimumPixel(bitmap, x + i, y + j, 255 - Math.clamp(r - Math.sqrt(i*i + j*j), 0, hardness) / hardness * opacity);
						}
					}
				}

				var r = Math.round(this.options.thickness/2);
				var bitmap = layer.data.context.imagedata;
				var hardness = (r - 1) * this.options.hardness + 1;

				circle(bitmap, x, y, r, hardness);

				layer.data.context.putImageData(bitmap, 0, 0);
				Sketchfull.dirty = true;
			},
			Move(layer, x0, y0, x1, y1) {
				if(layer.type != "bitmap") return;

				var opacity = this.options.opacity;

				var circle = function(bitmap, x, y, r, hardness) {
					for(var i = -r; i < r; i++) {
						for(var j = -r; j < r; j++) {
							Sketchfull.MinimumPixel(bitmap, x + i, y + j, 255 - Math.clamp(r - Math.sqrt(i*i + j*j), 0, hardness) / hardness * opacity);
						}
					}
				}

				x0 = Math.round(x0);
				y0 = Math.round(y0);
				x1 = Math.round(x1);
				y1 = Math.round(y1);

				var dx = Math.abs(x1 - x0);
				var dy = Math.abs(y1 - y0);
				var sx = (x0 < x1) ? 1 : -1;
				var sy = (y0 < y1) ? 1 : -1;
				var err = dx - dy;

				var r = Math.round(this.options.thickness/2);
				var bitmap = layer.data.context.imagedata;
				var hardness = (r - 1) * this.options.hardness + 1;

				while(true) {
					for(var x = -r-1; x < r+1; x++)
						Sketchfull.MinimumPixel(bitmap, x0 + x, y0, 255 - Math.clamp(r - Math.abs(x), 0, hardness) / hardness * opacity);
					for(var y = -r-1; y < r+1; y++)
						Sketchfull.MinimumPixel(bitmap, x0, y0 + y, 255 - Math.clamp(r - Math.abs(y), 0, hardness) / hardness * opacity);

					if((x0 == x1) && (y0 == y1)) break;
					var e2 = 2 * err;
					if(e2 > -dy) {err -= dy; x0 += sx;}
					if(e2 <	dx) {err += dx; y0 += sy;}
				}

				circle(bitmap, x0, y0, r, hardness);
				layer.data.context.putImageData(bitmap, 0, 0);

				Sketchfull.dirty = true;
			}
		},
		pencil: {
			switch: true,
			options: {
				thickness: 5,
				hardness: 0.75,
				opacity: 255,
			},
			toolbar: '<ul><li><span>Pencil</span></li><li><span>Line Thickness</span></li><li><span class="range-field"><input type="range" id="sketch-thickness" min="1" max="250" /></span></li><li><span>Opacity</span></li><li><span class="range-field"><input type="range" id="sketch-opacity" min="0" max="255" /></span></li><li><span>Hardness</span></li><li><span class="range-field"><input type="range" id="sketch-hardness" min="0" max="100" /></span></li></ul>',
			Init() {
				$("#sketch-thickness").val(this.options.thickness);
				$("#sketch-thickness").on("change", e => {this.options.thickness = parseInt(e.target.value)});
				$("#sketch-opacity").val(this.options.opacity);
				$("#sketch-opacity").on("change", e => {this.options.opacity = parseInt(e.target.value)});
				$("#sketch-hardness").val(100 - this.options.hardness * 100);
				$("#sketch-hardness").on("change", e => {this.options.hardness = 1 - parseInt(e.target.value) / 100});
			},
			Start(layer, x, y) {
				var opacity = this.options.opacity;

				var circle = function(bitmap, x, y, r, hardness) {
					for(var i = -r; i < r; i++) {
						for(var j = -r; j < r; j++) {
							Sketchfull.MaximumPixel(bitmap, x + i, y + j, Math.clamp(r - Math.sqrt(i*i + j*j), 0, hardness) / hardness * opacity);
						}
					}
				}

				var r = Math.round(this.options.thickness/2);
				var bitmap = layer.data.context.imagedata;
				var hardness = (r - 1) * this.options.hardness + 1;

				circle(bitmap, x, y, r, hardness);

				layer.data.context.putImageData(bitmap, 0, 0);
				Sketchfull.dirty = true;
			},
			Move(layer, x0, y0, x1, y1) {
				if(layer.type != "bitmap") return;

				var opacity = this.options.opacity;

				var circle = function(bitmap, x, y, r, hardness) {
					for(var i = -r; i < r; i++) {
						for(var j = -r; j < r; j++) {
							Sketchfull.MaximumPixel(bitmap, x + i, y + j, Math.clamp(r - Math.sqrt(i*i + j*j), 0, hardness) / hardness * opacity);
						}
					}
				}

				x0 = Math.round(x0);
				y0 = Math.round(y0);
				x1 = Math.round(x1);
				y1 = Math.round(y1);

				var dx = Math.abs(x1 - x0);
				var dy = Math.abs(y1 - y0);
				var sx = (x0 < x1) ? 1 : -1;
				var sy = (y0 < y1) ? 1 : -1;
				var err = dx - dy;

				var r = Math.round(this.options.thickness/2);
				var bitmap = layer.data.context.imagedata;
				var hardness = (r - 1) * this.options.hardness + 1;

				while(true) {
					for(var x = -r-1; x < r+1; x++)
						Sketchfull.MaximumPixel(bitmap, x0 + x, y0, Math.clamp(r - Math.abs(x), 0, hardness) / hardness * opacity);
					for(var y = -r-1; y < r+1; y++)
						Sketchfull.MaximumPixel(bitmap, x0, y0 + y, Math.clamp(r - Math.abs(y), 0, hardness) / hardness * opacity);

					if((x0 == x1) && (y0 == y1)) break;
					var e2 = 2 * err;
					if(e2 > -dy) {err -= dy; x0 += sx;}
					if(e2 <	dx) {err += dx; y0 += sy;}
				}

				circle(bitmap, x0, y0, r, hardness);
				layer.data.context.putImageData(bitmap, 0, 0);

				Sketchfull.dirty = true;
			}
		},
		brush: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Brush</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		fill: {
			switch: true,
			options: {
				threshold: 0,
			},
			toolbar: '<ul><li><span>Fill</span></li></ul>',
			Init() {
				// $("#sketch-threshold").val(this.options.threshold);
				// $("#sketch-threshold").on("change", e => {this.options.threshold = parseInt(e.target.value) / 100 * 255**3});
			},
			Start(layer, x, y) { // These are floats
				if(layer.type != "bitmap") return;
				var bitmap = layer.data.context.imagedata;

				x = Math.round(x);
				y = Math.round(y);

				var threshold = this.options.threshold;
				var targetColor = Sketchfull.GetPixel(bitmap, x, y);
				var replacementColor = Sketchfull.options.color;
				var difference = (a, b, threshold) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) <= threshold;

				if(difference(targetColor, replacementColor, threshold)) return;

				var queue = [[x, y]];

				while(queue.length > 0) {
					var pos = queue.pop();
					var west = east = pos[0];

					while(west >= 0 && difference(Sketchfull.GetPixel(bitmap, --west, pos[1]), targetColor, threshold)) {}
					while(east < bitmap.width && difference(Sketchfull.GetPixel(bitmap, ++east, pos[1]), targetColor, threshold)) {}

					for(var i = pos[0]; i > west; i--) {
						Sketchfull.MaximumPixel(bitmap, i, pos[1], 255);
						if(difference(Sketchfull.GetPixel(bitmap, i, pos[1] - 1), targetColor, threshold)) queue.push([i, pos[1] - 1]);
						if(difference(Sketchfull.GetPixel(bitmap, i, pos[1] + 1), targetColor, threshold)) queue.push([i, pos[1] + 1]);
					}

					for(var i = pos[0]; i < east; i++) {
						Sketchfull.MaximumPixel(bitmap, i, pos[1], 255);
						if(difference(Sketchfull.GetPixel(bitmap, i, pos[1] - 1), targetColor, threshold)) queue.push([i, pos[1] - 1]);
						if(difference(Sketchfull.GetPixel(bitmap, i, pos[1] + 1), targetColor, threshold)) queue.push([i, pos[1] + 1]);
					}
				}

				layer.data.context.putImageData(bitmap, 0, 0);
				Sketchfull.dirty = true;
			}
		},
		gradient: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Gradient</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		spray: {
			switch: true,
			options: {
				thickness: 5,
				chance: 0.75,
			},
			toolbar: '<ul><li><span>Spray</span></li><li><span>Line Thickness</span></li><li><span class="range-field"><input type="range" id="sketch-thickness" min="1" max="250" /></span></li><li><span>Chance</span></li><li><span class="range-field"><input type="range" id="sketch-chance" min="0" max="100" /></span></li></ul>',
			Init() {
				$("#sketch-thickness").val(this.options.thickness);
				$("#sketch-thickness").on("change", e => {this.options.thickness = parseInt(e.target.value)});
				$("#sketch-chance").val(this.options.chance * 100);
				$("#sketch-chance").on("change", e => {this.options.chance = parseInt(e.target.value) / 100});
			},
			Start(layer, x, y) {
				if(layer.type != "bitmap") return;

				var bitmap = layer.data.context.imagedata;

				r = Math.round(this.options.thickness/2);

				for(var i = -r-1; i < r+1; i++) {
					var height = Math.sqrt(r * r - i * i);

					for(var j = Math.floor(-height); j < Math.ceil(height); j++) {
						if(Math.random() < this.options.chance)
							Sketchfull.MaximumPixel(bitmap, x + i, y + j, Math.clamp(height - Math.abs(j), 0, 1) * 255);
					}
				}

				layer.data.context.putImageData(bitmap, 0, 0);
				Sketchfull.dirty = true;
			}
		},
		text: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Text</span></li></ul>',
			Start(layer, x, y) {
				var text = prompt("Enter text:");
				if(!text) return;

				Sketchfull.layers.splice(Sketchfull.layer+1, 0, {type: "text", visible: true, name: text, x: x, y: y, data: {color: Sketchfull.options.color, text: text}});
				Sketchfull.layer += 1;
				Sketchfull.dirty = true;
			}
		},
		line: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Line</span></li></ul>',
			Start(x, y) {

			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		rectangle: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Rectangle</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		circle: {
			switch: true,
			options: {
			},
			toolbar: '<ul><li><span>Circle</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		zoomin: {
			switch: false,
			toolbar: '<ul><li><span>Zoom</span></li></ul>',
			Init() {
				Sketchfull.zoom = Math.clamp(Sketchfull.zoom + 0.2, 0.01, 1000);
				Sketchfull.dirty = true;
			}
		},
		zoomout: {
			switch: false,
			toolbar: '<ul><li><span>Zoom</span></li></ul>',
			Init() {
				Sketchfull.zoom = Math.clamp(Sketchfull.zoom - 0.2, 0.01, 1000);
				Sketchfull.dirty = true;
			}
		},

		curve(layer, x0, y0, x1, y1, x2, y2) {
			var sx = x2-x1, sy = y2-y1;
			var xx = x0-x1, yy = y0-y1, xy;			/* relative values for checks */
			var dx, dy, err, ed, cur = xx*sy-yy*sx;					 /* curvature */

			//assert(xx*sx >= 0 && yy*sy >= 0);	/* sign of gradient must not change */

			if (sx*sx+sy*sy > xx*xx+yy*yy) { /* begin with longer part */ 
				x2 = x0; x0 = sx+x1; y2 = y0; y0 = sy+y1; cur = -cur; /* swap P0 P2 */
			}
			if (cur != 0) {																	/* no straight line */
				xx += sx; xx *= sx = x0 < x2 ? 1 : -1;			 /* x step direction */
				yy += sy; yy *= sy = y0 < y2 ? 1 : -1;			 /* y step direction */
				xy = 2*xx*yy; xx *= xx; yy *= yy;			/* differences 2nd degree */
				if (cur*sx*sy < 0) {									/* negated curvature? */
					xx = -xx; yy = -yy; xy = -xy; cur = -cur;
				}
				dx = 4.0*sy*(x1-x0)*cur+xx-xy;				/* differences 1st degree */
				dy = 4.0*sx*(y0-y1)*cur+yy-xy;
				xx += xx; yy += yy; err = dx+dy+xy;					/* error 1st step */
				do {
					cur = Math.min(dx+xy,-xy-dy);
					ed = Math.max(dx+xy,-xy-dy);				/* approximate error distance */
					ed = 255/(ed+2*ed*cur*cur/(4.*ed*ed+cur*cur)); 
					this.pixel(layer, x0,y0, ed*Math.abs(err-dx-dy-xy));			 /* plot curve */
					if (x0 == x2 && y0 == y2) return;/* last pixel -> curve finished */
					x1 = x0; cur = dx-err; y1 = 2*err+dy < 0;
					if (2*err+dx > 0) {												/* x step */
						if (err-dy < ed) this.pixel(layer, x0,y0+sy, ed*Math.abs(err-dy));
						x0 += sx; dx -= xy; err += dy += yy;
					}
					if (y1) {															 /* y step */
						if (cur < ed) this.pixel(layer, x1+sx,y0, ed*Math.abs(cur));
						y0 += sy; dy -= xy; err += dx += xx; 
					}
				} while (dy < dx);					/* gradient negates -> close curves */
			}
			this.lineaa(layer, x0,y0, x2,y2);					/* plot remaining needle to end */

			Sketchfull.dirty = true;
		},
		fillcircle(layer, x, y, r) {
			r = Math.round(r);

			for(var i = -r-1; i < r+1; i++) {
				var height = Math.sqrt(r * r - i * i);

				for(var j = Math.floor(-height); j < Math.ceil(height); j++)
					this.pixel(layer, x + i, y + j, Math.clamp(height - Math.abs(j), 0, 1) * 255);
			}
		}
	},
	options: {
		color: {r: 0, g: 0, b: 255},
		width: 10,
		dimensions: {width: 500, height: 500},
	},
	touches:{},
	transform: {x: 50, y: 50},
	zoom: 1,
	tool: "pencil",
	background: "transparent",
	dirty: false,
	dirtyLayer: 0, // Layer index
	dirtyLayers: 1, // Number of layers
	isMouseDown: false,

	get currentLayer() {return Sketchfull.layers[Sketchfull.layer];},
	get currentTool() {return Sketchfull.tools[Sketchfull.tool];},

	MinimumPixel(layer, x, y, alpha) {
		if(x < 0 || y < 0 || x >= layer.width || y >= layer.height) return;

		var offset = y * (layer.width * 4) + x * 4;
		var old = layer.data[offset+3];
		var lerp = Math.clamp((alpha + 255 - layer.data[offset+3]) / 255, 0, 1);
		layer.data[offset]   = Math.lerp(layer.data[offset], Sketchfull.options.color.r, lerp);
		layer.data[++offset] = Math.lerp(layer.data[offset], Sketchfull.options.color.g, lerp);
		layer.data[++offset] = Math.lerp(layer.data[offset], Sketchfull.options.color.b, lerp);
		layer.data[++offset] = Math.min(layer.data[offset], alpha & 0xff);
	},

	MaximumPixel(layer, x, y, alpha) {
		if(x < 0 || y < 0 || x >= layer.width || y >= layer.height) return;

		var offset = y * (layer.width * 4) + x * 4;
		var lerp = Math.clamp((alpha + 255 - layer.data[offset+3]) / 255, 0, 1);
		layer.data[offset]   = Math.lerp(layer.data[offset], Sketchfull.options.color.r, lerp);
		layer.data[++offset] = Math.lerp(layer.data[offset], Sketchfull.options.color.g, lerp);
		layer.data[++offset] = Math.lerp(layer.data[offset], Sketchfull.options.color.b, lerp);
		layer.data[++offset] = Math.max(layer.data[offset], alpha & 0xff);
	},

	GetPixel(bitmap, x, y) {
		var offset = y * (bitmap.width * 4) + x * 4;
		return {
			r: bitmap.data[offset + 0],
			g: bitmap.data[offset + 1],
			b: bitmap.data[offset + 2]
		};
	},

	Log(message, level) {
		console.log(message);
		Materialize.toast(message, 5000)
	},

	Update(timestamp) {
		try {
			var CompositeTextLayer = function(context, layer) {
				context.font = "20px Arial";
				context.fillStyle = "rgb(" + layer.data.color.r + ", " + layer.data.color.g + ", " + layer.data.color.b + ")";
				context.fillText(layer.data.text, layer.x, layer.y);
			}

			if(Sketchfull.dirty) {
				Sketchfull.canvas.style.translate = "translate3d(" + Sketchfull.transform.x + "%," + Sketchfull.transform.y + "%, 0)";
				Sketchfull.canvas.style.width  = Sketchfull.zoom * Sketchfull.options.dimensions.width  + "px";
				Sketchfull.canvas.style.height = Sketchfull.zoom * Sketchfull.options.dimensions.height + "px";

				Sketchfull.ractive.set("layers", Sketchfull.layers);
				Sketchfull.ractive.set("layer", Sketchfull.layer);

				// Only re-composite layers if necessary.
				if(Sketchfull.dirtyLayers != Sketchfull.layers.length || Sketchfull.dirtyLayer != Sketchfull.layer) {
					console.log("Re-compositing");

					// Update variables.
					Sketchfull.dirtyLayers = Sketchfull.layers.length;
					Sketchfull.dirtyLayer = Sketchfull.layer;

					// Clear Canvas
					Sketchfull.backcanvas.context.clearRect(0, 0, Sketchfull.backcanvas.width, Sketchfull.backcanvas.height);
					Sketchfull.forecanvas.context.clearRect(0, 0, Sketchfull.forecanvas.width, Sketchfull.forecanvas.height);

					// Fill background
					Sketchfull.backcanvas.context.fillStyle = Sketchfull.background;
					Sketchfull.backcanvas.context.fillRect(0, 0, Sketchfull.backcanvas.width, Sketchfull.backcanvas.height);

					for(var i = 0; i < Sketchfull.layer; i++) {
						if(!Sketchfull.layers[i].visible) continue;

						Sketchfull.layercanvas.context.clearRect(0, 0, Sketchfull.layercanvas.width, Sketchfull.layercanvas.height);
						switch(Sketchfull.layers[i].type) {
							case "bitmap": Sketchfull.layercanvas.context.drawImage(Sketchfull.layers[i].data, Sketchfull.layers[i].x, Sketchfull.layers[i].y); break;
							case "text": CompositeTextLayer(Sketchfull.layercanvas.context, Sketchfull.layers[i]); break;
							default: console.warn("Cannot draw layer");
						}
						Sketchfull.backcanvas.context.drawImage(Sketchfull.layercanvas, 0, 0);

						// Thumbnail
						var thumbcanvas = $("#sketch-layers > div[data-index='" + i + "'] canvas")[0];
						if(thumbcanvas) {
							thumbcanvas.context = thumbcanvas.getContext("2d");
							thumbcanvas.context.clearRect(0, 0, thumbcanvas.width, thumbcanvas.height);
							thumbcanvas.context.drawImage(Sketchfull.layercanvas, 0, 0, thumbcanvas.width, thumbcanvas.height);
						}
					}

					for(var i = Sketchfull.layer + 1; i < Sketchfull.layers.length; i++) {
						if(!Sketchfull.layers[i].visible) continue;

						Sketchfull.layercanvas.context.clearRect(0, 0, Sketchfull.layercanvas.width, Sketchfull.layercanvas.height);
						switch(Sketchfull.layers[i].type) {
							case "bitmap": Sketchfull.layercanvas.context.drawImage(Sketchfull.layers[i].data, Sketchfull.layers[i].x, Sketchfull.layers[i].y); break;
							case "text": CompositeTextLayer(Sketchfull.layercanvas.context, Sketchfull.layers[i]); break;
							default: console.warn("Cannot draw layer");
						}
						Sketchfull.forecanvas.context.drawImage(Sketchfull.layercanvas, 0, 0);

						// Thumbnail
						var thumbcanvas = $("#sketch-layers > div[data-index='" + i + "'] canvas")[0];
						if(thumbcanvas) {
							thumbcanvas.context = thumbcanvas.getContext("2d");
							thumbcanvas.context.clearRect(0, 0, thumbcanvas.width, thumbcanvas.height);
							thumbcanvas.context.drawImage(Sketchfull.layercanvas, 0, 0, thumbcanvas.width, thumbcanvas.height);
						}
					}
				}

				// Draw layers
				Sketchfull.canvas.context.clearRect(0, 0, Sketchfull.canvas.width, Sketchfull.canvas.height);

				// Merge
				Sketchfull.canvas.context.drawImage(Sketchfull.backcanvas, 0, 0);

				// Draw current layer
				if(Sketchfull.layers[Sketchfull.layer].visible) {
					Sketchfull.layercanvas.context.clearRect(0, 0, Sketchfull.layercanvas.width, Sketchfull.layercanvas.height);
					switch(Sketchfull.layers[Sketchfull.layer].type) {
						case "bitmap": Sketchfull.layercanvas.context.drawImage(Sketchfull.layers[Sketchfull.layer].data, Sketchfull.layers[Sketchfull.layer].x, Sketchfull.layers[Sketchfull.layer].y); break;
						case "text": CompositeTextLayer(Sketchfull.layercanvas.context, Sketchfull.layers[Sketchfull.layer]); break;
						default: console.warn("Cannot draw layer");
					}
					Sketchfull.canvas.context.drawImage(Sketchfull.layercanvas, 0, 0);

					// Thumbnail
					var thumbcanvas = $("#sketch-layers > div[data-index='" + Sketchfull.layer + "'] canvas")[0];
					if(thumbcanvas) {
						thumbcanvas.context = thumbcanvas.getContext("2d");
						thumbcanvas.context.clearRect(0, 0, thumbcanvas.width, thumbcanvas.height);
						thumbcanvas.context.drawImage(Sketchfull.layercanvas, 0, 0, thumbcanvas.width, thumbcanvas.height);
					}
				}

				// Foreground
				Sketchfull.canvas.context.drawImage(Sketchfull.forecanvas, 0, 0);

				Sketchfull.dirty = false;
			}
		}
		finally {
			window.requestAnimationFrame(Sketchfull.Update);
		}
	},

	Init() {
		Sketchfull.ractive = new Ractive({
			el: '#sketch-layer-panel-content',
			template: "#sfui-layer-panel",
			data: {layers: Sketchfull.layers, layer: Sketchfull.layer}
		});

		$(".dropdown-button").dropdown({
			constrainWidth: false,
			belowOrigin: true
		});
		$('.dropdown-content .dropdown-button').on("click", e => {e.stopPropagation();});
		$(".resizable").resizable();
		$(".draggable").draggable({handle: ".draggable-handle"});
		$(".colpick").colpick({
			color: "0000ff",
			flat: true,
			submit: false,
			onChange: (hsb, hex, rgb, el, bySetColor) => Sketchfull.options.color = rgb
		});
		$('.tooltipped').tooltip({delay: 50});
		$('.modal').modal({endingTop: '50%'});

		Sketchfull.canvas = $("#sketch-canvas")[0];
		Sketchfull.canvas.width = Sketchfull.options.dimensions.width;
		Sketchfull.canvas.height = Sketchfull.options.dimensions.height;
		Sketchfull.canvas.isMouseDown = false;
		Sketchfull.canvas.context = Sketchfull.canvas.getContext("2d");

		// For better performance.
		Sketchfull.forecanvas = document.createElement('canvas');
		Sketchfull.layercanvas = document.createElement('canvas');
		Sketchfull.backcanvas = document.createElement('canvas');
		Sketchfull.backcanvas.width = Sketchfull.layercanvas.width = Sketchfull.forecanvas.width = Sketchfull.canvas.width;
		Sketchfull.backcanvas.height = Sketchfull.layercanvas.height = Sketchfull.forecanvas.height = Sketchfull.canvas.height;
		Sketchfull.forecanvas.context = Sketchfull.forecanvas.getContext("2d");
		Sketchfull.layercanvas.context = Sketchfull.layercanvas.getContext("2d");
		Sketchfull.backcanvas.context = Sketchfull.backcanvas.getContext("2d");

		// Handle switching
		$("#sketch-tools a").on("click", e => {
			if("tool" in e.currentTarget.dataset && e.currentTarget.dataset.tool in Sketchfull.tools) {
				if(Sketchfull.tools[e.currentTarget.dataset.tool].switch) $("#sketch-toolbar").html(Sketchfull.currentTool.toolbar);
				if(Sketchfull.tools[e.currentTarget.dataset.tool].Init) Sketchfull.tools[e.currentTarget.dataset.tool].Init();
				if(Sketchfull.tools[e.currentTarget.dataset.tool].switch) Sketchfull.tool = e.currentTarget.dataset.tool;
			}
		});

		Sketchfull.tool = "pencil";
		$("#sketch-toolbar").html(Sketchfull.tools[Sketchfull.tool].toolbar);
		if(Sketchfull.currentTool.Init) Sketchfull.currentTool.Init()

		// Layer reorder
		var sortableStart;
		$("#sketch-layers").sortable({
			// containment: "parent",
			start(event, ui) {sortableStart = parseInt(ui.item[0].dataset.index);},
			stop(event, ui) {
				var a = ui.item.prev()[0], b = ui.item.next()[0];

				// Cannot re-arrange a list of 1.
				if(a === undefined && b === undefined) return false;

				var position = b !== undefined ? 
					(parseInt(b.dataset.index) > sortableStart ? parseInt(b.dataset.index) - 1 : parseInt(b.dataset.index)) :
					(parseInt(a.dataset.index) > sortableStart ? parseInt(a.dataset.index) : parseInt(a.dataset.index) + 1);

				var layer = Sketchfull.layers.splice(sortableStart, 1)[0];
				Sketchfull.layers.splice(position, 0, layer);
				Sketchfull.layer = position;

				Sketchfull.dirtyLayers = -1; // Nasty hack to solve a bug where certain layers don't render.
				Sketchfull.dirty = true;

				return false;
			}
		});

		window.addEventListener("wheel", e => {
			if(e.ctrlKey) { // Zoom
				e.preventDefault();
				Sketchfull.zoom = Math.clamp(Sketchfull.zoom - e.deltaY / 1000, 0.01, 1000);
			} else { // Move
				Sketchfull.transform.x += e.deltaX / 25;
				Sketchfull.transform.y += e.deltaY / 25;
			}

			Sketchfull.canvas.style.left = Sketchfull.transform.x + "%";
			Sketchfull.canvas.style.top	= Sketchfull.transform.y + "%";
			Sketchfull.canvas.style.width	= Sketchfull.zoom * Sketchfull.canvas.width + "px";
			Sketchfull.canvas.style.height	= Sketchfull.zoom * Sketchfull.canvas.height + "px";
		});

		Sketchfull.canvas.addEventListener("mousedown", e => {
			Sketchfull.isMouseDown = true;
			if(Sketchfull.currentTool.Start)
				Sketchfull.currentTool.Start(
					Sketchfull.currentLayer,
					(e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width,
					(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height
				);
		});

		Sketchfull.canvas.addEventListener("touchstart", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
				if(Sketchfull.currentTool.Start)
					Sketchfull.currentTool.Start(
						Sketchfull.currentLayer,
						(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / e.changedTouches[i].target.offsetWidth * Sketchfull.canvas.width,
						(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.canvas.height
					);
			}
		});

		window.addEventListener("mousemove", e => {
			if(Sketchfull.isMouseDown) {
				if(Sketchfull.currentTool.Move)
					Sketchfull.currentTool.Move(
						Sketchfull.currentLayer,
						((e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) - e.movementX) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width,
						((e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) - e.movementY) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height,
						(e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width,
						(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height
					);
			}
		});

		Sketchfull.canvas.parentElement.addEventListener("touchmove", e => e.preventDefault());
		Sketchfull.canvas.addEventListener("touchmove", e => {
			e.preventDefault();
			for(var i = 0; i < e.changedTouches.length; i++) {
				if(Sketchfull.currentTool.Move)
					Sketchfull.currentTool.Move(
						Sketchfull.currentLayer,
						(Sketchfull.touches[e.changedTouches[i].identifier].pageX - Sketchfull.touches[e.changedTouches[i].identifier].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / Sketchfull.touches[e.changedTouches[i].identifier].target.offsetWidth * Sketchfull.canvas.width,
						(Sketchfull.touches[e.changedTouches[i].identifier].pageY - Sketchfull.touches[e.changedTouches[i].identifier].target.offsetTop + Sketchfull.touches[e.changedTouches[i].identifier].target.offsetHeight/2) / Sketchfull.touches[e.changedTouches[i].identifier].target.offsetHeight * Sketchfull.canvas.height,
						(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / e.changedTouches[i].target.offsetWidth * Sketchfull.canvas.width,
						(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.canvas.height
					);
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
			}
		});

		Sketchfull.canvas.addEventListener("mouseup", e => {
			Sketchfull.isMouseDown = false;
			if(Sketchfull.currentTool.End)
				Sketchfull.currentTool.End(
					Sketchfull.currentLayer,
					(e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width,
					(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height
				);
		});

		Sketchfull.canvas.addEventListener("touchend", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				if(Sketchfull.currentTool.End)
					Sketchfull.currentTool.End(
						Sketchfull.currentLayer,
						(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / e.changedTouches[i].target.offsetWidth * Sketchfull.canvas.width,
						(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.canvas.height
					);
				delete Sketchfull.touches[e.changedTouches[i].identifier];
			}
		});

		window.addEventListener("keydown", e => {
			console.log(e);
			// https://www.nobledesktop.com/shortcuts/photoshopcs5/pc
			// key: character
			// altKey: bool
			// ctrlKey: bool
			// shiftKey: bool
		});

		$(".sketch-panel").removeClass("hide");
		$("#sketch-canvas").removeClass("hide");
		$("#sketch-toolbar").removeClass("hide");

		window.requestAnimationFrame(Sketchfull.Update);
	},

	Open(e) {
		var reader = new FileReader();
		reader.onload = function(event) {
			var image = new Image();
			image.onload = function() {
				console.dir(image);
				var canvas = document.createElement('canvas');
				canvas.width = image.width;
				canvas.height = image.height;
				canvas.context = canvas.getContext("2d");
				canvas.context.drawImage(image, 0, 0);
				canvas.context.imagedata = canvas.context.getImageData(0, 0, canvas.width, canvas.height);
				Sketchfull.layers.push({type: "bitmap", visible: true, name: e.srcElement.value.split(/(\/|\\)+/).last(), x: 0, y: 0, data: canvas});
				Sketchfull.layer += 1;
				Sketchfull.dirty = true;
			}
			image.src = event.target.result;
		}
		reader.readAsDataURL(e.target.files[0]);
	},

	Invert() {
		// TODO fix
		switch(Sketchfull.currentLayer.type) {
			case "bitmap":
				var bitmap = Sketchfull.currentLayer.data.context.imagedata;
				for(var i = 0; i < bitmap.data.length; i += 4) {
					bitmap.data[i + 0] = 255 - bitmap.data[i + 0];
					bitmap.data[i + 1] = 255 - bitmap.data[i + 1];
					bitmap.data[i + 2] = 255 - bitmap.data[i + 2];
				};
				Sketchfull.currentLayer.data.context.putImageData(bitmap, 0, 0);
				break;
			case "text":
			case "line":
			case "rectangle":
			case "circle":
				Sketchfull.currentLayer.data.color = {r: 255 - Sketchfull.currentLayer.data.color.r, g: 255 - Sketchfull.currentLayer.data.color.g, b: 255 - Sketchfull.currentLayer.data.color.b};
				break;
			default:
				console.warn("Cannot invert the current layer")
		}
		Sketchfull.dirty = true;
	},

	Grayscale() {
		// TODO fix
		switch(Sketchfull.currentLayer.type) {
			case "bitmap":
				var bitmap = Sketchfull.currentLayer.data.context.imagedata;
				for(var i = 0; i < bitmap.data.length; i += 4) {
					var luma =  0.2126 * bitmap.data[i + 0] + 0.7152 * bitmap.data[i + 1] + 0.0722 * bitmap.data[i + 2];
					bitmap.data[i + 0] = bitmap.data[i + 1] = bitmap.data[i + 2] = luma;
				};
				Sketchfull.currentLayer.data.context.putImageData(bitmap, 0, 0);
				break;
			case "text":
			case "line":
			case "rectangle":
			case "circle":
				var luma =  0.2126 * Sketchfull.currentLayer.data.color.r + 0.7152 * Sketchfull.currentLayer.data.color.g + 0.0722 * Sketchfull.currentLayer.data.color.b;
				Sketchfull.currentLayer.data.color = {r: luma, g: luma, b: luma};
				break;
			default:
				console.warn("Cannot invert the current layer")
		}
		Sketchfull.dirty = true;
	},

	SelectLayer(layer) {
		layer = typeof value === 'number' ? layer : parseInt(layer);

		if(layer < 0 || layer >= Sketchfull.layers.length) return false;
		Sketchfull.layer = layer;
		Sketchfull.dirty = true;

		return true;
	},

	NewLayer() {
		if(Sketchfull.layers.length == 0) {
			Sketchfull.layers[0] = {type: "bitmap", visible: true, name: "Layer 0", x: 0, y: 0, data: createCanvasOfDimensions(500, 500)};
			Sketchfull.layer = 0;
		} else {
			Sketchfull.layers.splice(Sketchfull.layer + 1, 0, {type: "bitmap", visible: true, name: "Layer " + Sketchfull.layers.length, x: 0, y: 0, data: createCanvasOfDimensions(500, 500)});
			Sketchfull.layer += 1;
		}
		Sketchfull.dirty = true;
	},

	DeleteLayer(layer) {
		layer = typeof value === 'number' ? layer : parseInt(layer);

		if(layer < 0 || layer >= Sketchfull.layers.length) return false;

		if(layer == Sketchfull.layer) Sketchfull.layer -= 1;

		Sketchfull.layers.splice(layer, 1);
		Sketchfull.dirty = true;

		return true;
	},

	NameLayer(layer, name) {
		layer = typeof value === 'number' ? layer : parseInt(layer);

		if(layer < 0 || layer >= Sketchfull.layers.length) return false;
		Sketchfull.layers[layer].name = name;
		Sketchfull.dirty = true;
		return true;
	},

	ToggleLayer(layer) {
		layer = typeof value === 'number' ? layer : parseInt(layer);

		if(layer < 0 || layer >= Sketchfull.layers.length) return false;

		Sketchfull.layers[layer].visible = !Sketchfull.layers[layer].visible;

		Sketchfull.dirtyLayers = -1;
		Sketchfull.dirty = true;

		return true;
	},

	BackgroundColor(color) {
		Sketchfull.background = color;
		Sketchfull.dirtyLayers = -1;
		Sketchfull.dirty = true;
	},

	ResetZoom() {
		Sketchfull.zoom = 1;
		Sketchfull.transform = {x: 0, y: 50};
		Sketchfull.dirty = true;
	},

	Clear() {
		switch(Sketchfull.currentLayer.type) {
			case "bitmap": Sketchfull.currentLayer.data = new ImageData(Sketchfull.currentLayer.data.width, Sketchfull.currentLayer.data.height); break;
			default: Sketchfull.layers.splice(Sketchfull.layer, 1); break; // Little point clearing a line or text.
		}
		Sketchfull.dirty = true;
	},

	Download(source, format) {
		source.download = "image." + format.split("/")[1];
		source.href = Sketchfull.canvas.toDataURL(format).replace(/^data:image\/[^;]/, 'data:application/octet-stream');
	},

	Print() {
		var printwindow = window.open(Sketchfull.canvas.toDataURL("image/png"), "_blank");
		printwindow.onload = () => window.print();
	}
};

// Lets go!
$(document).ready(Sketchfull.Init);
