Math.clamp = (value, min, max) => value > min ? (value < max ? value: max) : min;

const Sketchfull = {
	canvas: [],
	layers: [
		new ImageData(500, 500)
	],
	tools: {
		undo: {

		},
		redo: {

		},
		select: {
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
			options: {
				alllayers: false
			},
			toolbar: '<ul><li><span>Color Picker</span></li><li><input type="checkbox" id="sketch-tool-pick-alllayers" checked="unchecked" /><label for="sketch-tool-pick-alllayers">Sample all layers</label></li></ul>',
			Start(layer, x, y) {
				$(".colpick").colpickSetColor(Sketchfull.GetPixel(layer, Math.round(x), Math.round(y)));
			},
			Move(layer, x0, y0, x1, y1) {
				this.Start(layer, x1, y1);
			},
			End(layer, x, y) {
			}
		},
		erase: {
			options: {
			},
			toolbar: '<ul><li><span>Eraser</span></li><li><span>Line Thickness</span></li><li><span class="range-field"><input type="range" id="sketch-thickness" min="1" max="250" value="5" /></span></li></ul>',
			Start(layer, x, y) {
				this.Move(layer, x, y, x, y);
			},
			Move(layer, x0, y0, x1, y1) {
				var circle = function(layer, x, y, r) {
					r = Math.round(r);

					for(var i = -r-1; i < r+1; i++) {
						var height = Math.sqrt(r * r - i * i);

						for (var j = Math.floor(-height); j < Math.ceil(height); j++)
							Sketchfull.MinimumPixel(layer, x + i, y + j, 255 - Math.clamp(height - Math.abs(j), 0, 1) * 255);
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

				var r = Math.round(Sketchfull.options.width/2);

				circle(layer, x0, y0, r);

				while(true) {

					for (var x = -r-1; x < r+1; x++)
						Sketchfull.MinimumPixel(layer, x0 + x, y0, 255 - Math.clamp(r + 0.5 - Math.abs(x), 0, 1) * 255);
					for (var y = -r-1; y < r+1; y++)
						Sketchfull.MinimumPixel(layer, x0, y0 + y, 255 - Math.clamp(r + 0.5 - Math.abs(y), 0, 1) * 255);

					if((x0 == x1) && (y0 == y1)) break;
					var e2 = 2 * err;
					if(e2 > -dy) {err -= dy; x0 += sx;}
					if(e2 <	dx) {err += dx; y0 += sy;}
				}

				circle(layer, x0, y0, r);

				Sketchfull.dirty = true;
			},
			End(layer, x, y) {
			}
		},
		pencil: {
			options: {
			},
			toolbar: '<ul><li><span>Pencil</span></li><li><span>Line Thickness</span></li><li><span class="range-field"><input type="range" id="sketch-thickness" min="1" max="250" value="5" /></span></li></ul>',
			Start(layer, x, y) {
				this.Move(layer, x, y, x, y);
			},
			Move(layer, x0, y0, x1, y1) {
				var circle = function(layer, x, y, r) {
					r = Math.round(r);

					for(var i = -r-1; i < r+1; i++) {
						var height = Math.sqrt(r * r - i * i);

						for (var j = Math.floor(-height); j < Math.ceil(height); j++)
							Sketchfull.MaximumPixel(layer, x + i, y + j, Math.clamp(height - Math.abs(j), 0, 1) * 255);
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

				var r = Math.round(Sketchfull.options.width/2);

				circle(layer, x0, y0, r);

				while(true) {

					for (var x = -r-1; x < r+1; x++)
						Sketchfull.MaximumPixel(layer, x0 + x, y0, Math.clamp(r + 0.5 - Math.abs(x), 0, 1) * 255);
					for (var y = -r-1; y < r+1; y++)
						Sketchfull.MaximumPixel(layer, x0, y0 + y, Math.clamp(r + 0.5 - Math.abs(y), 0, 1) * 255);

					if((x0 == x1) && (y0 == y1)) break;
					var e2 = 2 * err;
					if(e2 > -dy) {err -= dy; x0 += sx;}
					if(e2 <	dx) {err += dx; y0 += sy;}
				}

				circle(layer, x0, y0, r);

				Sketchfull.dirty = true;
			},
			End(layer, x, y) {
			}
		},
		brush: {
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
			options: {
			},
			toolbar: '<ul><li><span>Fill</span></li></ul>',
			Start(layer, x, y) { // These are floats
				x = Math.round(x);
				y = Math.round(y);

				var threshold = 0;
				var targetColor = Sketchfull.GetPixel(layer, x, y);
				var replacementColor = Sketchfull.options.color;
				var difference = (a, b, threshold) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) <= threshold;

				if(difference(targetColor, replacementColor, threshold)) return;

				var queue = [[x, y]];

				while(queue.length > 0) {
					var pos = queue.pop();
					var west = east = pos[0];

					while(west >= 0 && difference(Sketchfull.GetPixel(layer, --west, pos[1]), targetColor, threshold)) {}
					while(east < layer.width && difference(Sketchfull.GetPixel(layer, ++east, pos[1]), targetColor, threshold)) {}

					for(var i = pos[0]; i > west; i--) {
						Sketchfull.MaximumPixel(layer, i, pos[1], 255);
						if(difference(Sketchfull.GetPixel(layer, i, pos[1] - 1), targetColor, threshold)) queue.push([i, pos[1] - 1]);
						if(difference(Sketchfull.GetPixel(layer, i, pos[1] + 1), targetColor, threshold)) queue.push([i, pos[1] + 1]);
					}

					for(var i = pos[0]; i < east; i++) {
						Sketchfull.MaximumPixel(layer, i, pos[1], 255);
						if(difference(Sketchfull.GetPixel(layer, i, pos[1] - 1), targetColor, threshold)) queue.push([i, pos[1] - 1]);
						if(difference(Sketchfull.GetPixel(layer, i, pos[1] + 1), targetColor, threshold)) queue.push([i, pos[1] + 1]);
					}
				}

				Sketchfull.dirty = true;
			},
			Move(layer, x0, y0, x1, y1) {
			},
			End(layer, x, y) {
			}
		},
		gradient: {
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
			options: {
			},
			toolbar: '<ul><li><span>Spray</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		text: {
			options: {
			},
			toolbar: '<ul><li><span>Text</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		line: {
			options: {
			},
			toolbar: '<ul><li><span>Line</span></li></ul>',
			Start(x, y) {
				console.log(x, y);
			},
			Move(x, y, dx, dy) {
			},
			End(x, y) {
			}
		},
		rectangle: {
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
			options: {
			},
			toolbar: '<ul><li><span>Zoom</span></li></ul>',
			Start(layer, x, y) {
				Sketchfull.zoom = Math.clamp(Sketchfull.zoom + 0.2, 0.01, 1000);

				Sketchfull.canvas.style.left = Sketchfull.transform.x + "%";
				Sketchfull.canvas.style.top	= Sketchfull.transform.y + "%";
				Sketchfull.canvas.style.width	= Sketchfull.zoom * Sketchfull.layers[0].width + "px";
				Sketchfull.canvas.style.height	= Sketchfull.zoom * Sketchfull.layers[0].height + "px";
			},
			Move(layer, x0, y0, x1, y1) {
			},
			End(layer, x, y) {
			}
		},
		zoomout: {
			options: {
			},
			toolbar: '<ul><li><span>Zoom</span></li></ul>',
			Start(layer, x, y) {
				Sketchfull.zoom = Math.clamp(Sketchfull.zoom - 0.2, 0.01, 1000);

				Sketchfull.canvas.style.left = Sketchfull.transform.x + "%";
				Sketchfull.canvas.style.top	= Sketchfull.transform.y + "%";
				Sketchfull.canvas.style.width	= Sketchfull.zoom * Sketchfull.layers[0].width + "px";
				Sketchfull.canvas.style.height	= Sketchfull.zoom * Sketchfull.layers[0].height + "px";
			},
			Move(layer, x0, y0, x1, y1) {
			},
			End(layer, x, y) {
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

				for (var j = Math.floor(-height); j < Math.ceil(height); j++)
					this.pixel(layer, x + i, y + j, Math.clamp(height - Math.abs(j), 0, 1) * 255);
			}
		}
	},
	options: {
		color: {r: 0, g: 0, b: 255},
		width: 10
	},
	touches:{},
	transform: {x: 0, y: 50},
	zoom: 1,
	tool: "pencil",
	background: "transparent",
	dirty: false,
	isMouseDown: false,

	MinimumPixel(layer, x, y, alpha) {
		if(x < 0 || y < 0 || x >= layer.width || y >= layer.height) return;

		// console.log(layer, x, y, alpha);
		layer.data[y * (layer.width * 4) + x * 4 + 0] = (Sketchfull.options.color.r) & 0xff;
		layer.data[y * (layer.width * 4) + x * 4 + 1] = (Sketchfull.options.color.g) & 0xff;
		layer.data[y * (layer.width * 4) + x * 4 + 2] = (Sketchfull.options.color.b) & 0xff;
		layer.data[y * (layer.width * 4) + x * 4 + 3] = Math.min(layer.data[y * (layer.width * 4) + x * 4 + 3], alpha & 0xff);
	},

	MaximumPixel(layer, x, y, alpha) {
		if(x < 0 || y < 0 || x >= layer.width || y >= layer.height) return;

		// console.log(layer, x, y, alpha);
		layer.data[y * (layer.width * 4) + x * 4 + 0] = (Sketchfull.options.color.r) & 0xff;
		layer.data[y * (layer.width * 4) + x * 4 + 1] = (Sketchfull.options.color.g) & 0xff;
		layer.data[y * (layer.width * 4) + x * 4 + 2] = (Sketchfull.options.color.b) & 0xff;
		layer.data[y * (layer.width * 4) + x * 4 + 3] = Math.max(layer.data[y * (layer.width * 4) + x * 4 + 3], alpha & 0xff);
	},

	GetPixel(layer, x, y) {
		return {
			r: layer.data[y * (layer.width * 4) + x * 4 + 0],
			g: layer.data[y * (layer.width * 4) + x * 4 + 1],
			b: layer.data[y * (layer.width * 4) + x * 4 + 2]
		};
	},

	Update(timestamp) {
		if(Sketchfull.dirty) {
			// Draw layers
			if(Sketchfull.background == "transparent") {
				Sketchfull.canvas.context.clearRect(0, 0, Sketchfull.canvas.width, Sketchfull.canvas.height);
			} else {
				Sketchfull.canvas.context.fillStyle = Sketchfull.background;
				Sketchfull.canvas.context.fillRect(0, 0, Sketchfull.canvas.width, Sketchfull.canvas.height);
			}
			Sketchfull.canvas.context.putImageData(Sketchfull.layers[0], 0, 0);

			Sketchfull.dirty = false;
		}

		window.requestAnimationFrame(Sketchfull.Update);
	},

	Init() {
		$(".dropdown-button").dropdown();
		$(".resizable").resizable();
		$(".draggable").draggable({handle: ".draggable-handle"});
		$(".colpick").colpick({
			color: "0000ff",
			flat: true,
			onChange: function(hsb, hex, rgb, el, bySetColor) {
				Sketchfull.options.color = rgb
			}
		});

		Sketchfull.canvas = $("#sketch-canvas")[0];
		Sketchfull.canvas.width = 500;
		Sketchfull.canvas.height = 500;
		Sketchfull.canvas.isMouseDown = false;
		Sketchfull.canvas.context = Sketchfull.canvas.getContext("2d");

		// Handle switching
		$("#sketch-tools a").on("click", e => {
			if("tool" in e.currentTarget.dataset && e.currentTarget.dataset.tool in Sketchfull.tools) {
				Sketchfull.tool = e.currentTarget.dataset.tool;
				$("#sketch-toolbar").html(Sketchfull.tools[Sketchfull.tool].toolbar);
			}
		});

		$("#sketch-thickness").on("change", e => {
			Sketchfull.options.width = e.target.value
		});

		window.addEventListener("wheel", e => {
			if(e.ctrlKey) { // Zoom
				e.preventDefault();
				Sketchfull.zoom = Math.clamp(Sketchfull.zoom - e.deltaY / 1000, 0.01, 1000);
			} else { // Move
				Sketchfull.transform.x += -e.deltaX / 25;
				Sketchfull.transform.y += -e.deltaY / 25;
			}

			Sketchfull.canvas.style.left = Sketchfull.transform.x + "%";
			Sketchfull.canvas.style.top	= Sketchfull.transform.y + "%";
			Sketchfull.canvas.style.width	= Sketchfull.zoom * Sketchfull.layers[0].width + "px";
			Sketchfull.canvas.style.height	= Sketchfull.zoom * Sketchfull.layers[0].height + "px";
		});

		Sketchfull.canvas.addEventListener("mousedown", e => {
			Sketchfull.isMouseDown = true;
			Sketchfull.tools[Sketchfull.tool].Start(
				Sketchfull.layers[0],
				(e.pageX - Sketchfull.canvas.offsetLeft) / Sketchfull.canvas.offsetWidth * Sketchfull.layers[0].width,
				(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.layers[0].height
			);
		});

		Sketchfull.canvas.addEventListener("touchstart", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
				Sketchfull.tools[Sketchfull.tool].Start(
					Sketchfull.layers[0],
					(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft) / e.changedTouches[i].target.offsetWidth * Sketchfull.layers[0].width,
					(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.layers[0].height
				);
			}
		});

		window.addEventListener("mousemove", e => {
			if(Sketchfull.isMouseDown) {
				Sketchfull.tools[Sketchfull.tool].Move(
					Sketchfull.layers[0],
					((e.pageX - Sketchfull.canvas.offsetLeft) - e.movementX) / Sketchfull.canvas.offsetWidth * Sketchfull.layers[0].width,
					((e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) - e.movementY) / Sketchfull.canvas.offsetHeight * Sketchfull.layers[0].height,
					(e.pageX - Sketchfull.canvas.offsetLeft) / Sketchfull.canvas.offsetWidth * Sketchfull.layers[0].width,
					(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.layers[0].height
				);
			}
		});

		Sketchfull.canvas.parentElement.addEventListener("touchmove", e => e.preventDefault());
		Sketchfull.canvas.addEventListener("touchmove", e => {
			e.preventDefault();
			for(var i = 0; i < e.changedTouches.length; i++) {
				Sketchfull.tools[Sketchfull.tool].Move(
					Sketchfull.layers[0],
					(Sketchfull.touches[e.changedTouches[i].identifier].pageX - Sketchfull.touches[e.changedTouches[i].identifier].target.offsetLeft) / Sketchfull.touches[e.changedTouches[i].identifier].target.offsetWidth * Sketchfull.layers[0].width,
					(Sketchfull.touches[e.changedTouches[i].identifier].pageY - Sketchfull.touches[e.changedTouches[i].identifier].target.offsetTop + Sketchfull.touches[e.changedTouches[i].identifier].target.offsetHeight/2) / Sketchfull.touches[e.changedTouches[i].identifier].target.offsetHeight * Sketchfull.layers[0].height,
					(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft) / e.changedTouches[i].target.offsetWidth * Sketchfull.layers[0].width,
					(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.layers[0].height
				);
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
			}
		});

		Sketchfull.canvas.addEventListener("mouseup", e => {
			Sketchfull.isMouseDown = false;
			Sketchfull.tools[Sketchfull.tool].End(
				Sketchfull.layers[0],
				(e.pageX - Sketchfull.canvas.offsetLeft) / Sketchfull.canvas.offsetWidth * Sketchfull.layers[0].width,
				(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.layers[0].height
			);
		});

		Sketchfull.canvas.addEventListener("touchend", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				Sketchfull.tools[Sketchfull.tool].End(
					Sketchfull.layers[0],
					(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft) / e.changedTouches[i].target.offsetWidth * Sketchfull.layers[0].width,
					(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.layers[0].height
				);
				delete Sketchfull.touches[e.changedTouches[i].identifier];
			}
		});

		window.requestAnimationFrame(Sketchfull.Update);
	},

	Open(e) {
		var reader = new FileReader();
		reader.onload = function(event) {
			var image = new Image();
			image.onload = function() {
				console.dir(image);
				var canvas = document.createElement('canvas');
				context = canvas.getContext("2d");
				Sketchfull.canvas.width = canvas.width = image.width;
				Sketchfull.canvas.height = canvas.height = image.height;
				context.drawImage(image, 0, 0);
				Sketchfull.layers[0] = context.getImageData(0, 0, image.width, image.height);
				Sketchfull.dirty = true;
			}
			image.src = event.target.result;
		}
		reader.readAsDataURL(e.target.files[0]);
	},

	Invert() {
		for(var i = 0; i < Sketchfull.layers[0].data.length; i += 4) {
			Sketchfull.layers[0].data[i + 0] = 255 - Sketchfull.layers[0].data[i + 0];
			Sketchfull.layers[0].data[i + 1] = 255 - Sketchfull.layers[0].data[i + 1];
			Sketchfull.layers[0].data[i + 2] = 255 - Sketchfull.layers[0].data[i + 2];
		}
		Sketchfull.dirty = true;
	},

	ResetZoom() {
		Sketchfull.zoom = 1;
		Sketchfull.transform = {x: 0, y: 50};

		Sketchfull.canvas.style.left = Sketchfull.transform.x + "%";
		Sketchfull.canvas.style.top	= Sketchfull.transform.y + "%";
		Sketchfull.canvas.style.width	= Sketchfull.zoom * Sketchfull.layers[0].width + "px";
		Sketchfull.canvas.style.height	= Sketchfull.zoom * Sketchfull.layers[0].height + "px";
	},

	Clear() {
		Sketchfull.layers = [new ImageData(500, 500)];
		Sketchfull.dirty = true;
	},

	Download(source) {
		source.download = "image.png";
		source.href = Sketchfull.canvas.toDataURL("image/png").replace(/^data:image\/[^;]/, 'data:application/octet-stream');
	},

	Print() {
		var printwindow = window.open(Sketchfull.canvas.toDataURL("image/png"), "_blank");
		printwindow.onload = () => window.print();
	}
};

// Lets go!
$(document).ready(Sketchfull.Init);