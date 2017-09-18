Math.clamp = (value, min, max) => value > min ? (value < max ? value: max) : min;

const Sketchfull = {
	canvas: [],
	layers: [
		new ImageData(800, 800)
	],
	tools: {
		linepixel(layer, x0, y0, x1, y1) {
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

			this.circle(layer, x0, y0, r);

			while(true) {

				for (var x = -r-1; x < r+1; x++)
					this.pixel(layer, x0 + x, y0, Math.clamp(r + 0.5 - Math.abs(x), 0, 1) * 255);
				for (var y = -r-1; y < r+1; y++)
					this.pixel(layer, x0, y0 + y, Math.clamp(r + 0.5 - Math.abs(y), 0, 1) * 255);

				if((x0 == x1) && (y0 == y1)) break;
				var e2 = 2 * err;
				if(e2 > -dy) {err -= dy; x0 += sx;}
				if(e2 <	dx) {err += dx; y0 += sy;}
			}

			this.circle(layer, x0, y0, r);
		},
		lineaa(layer, x0, y0, x1, y1) {
			var wd = Sketchfull.options.width-1;
			var dx = Math.abs(x1-x0), sx = x0 < x1 ? 1 : -1; 
			var dy = Math.abs(y1-y0), sy = y0 < y1 ? 1 : -1; 
			var err = dx-dy, e2, x2, y2; /* error value e_xy */
			var ed = dx+dy == 0 ? 1 : Math.sqrt(dx*dx+dy*dy);

			this.circle(layer, x0, y0, Sketchfull.options.width/2);
			
			for (wd = (wd+1)/2;;) {											 /* pixel loop */
				this.pixel(layer, x0,y0,Math.max(0,255 - 255*(Math.abs(err-dx+dy)/ed-wd+1)));
				e2 = err; x2 = x0;
				if (2*e2 >= -dx) { /* x step */
					for (e2 += dy, y2 = y0; e2 < ed*wd && (y1 != y2 || dx > dy); e2 += dx)
						y2 += sy;
						// this.pixel(layer, x0, , Math.max(0,255 - 255*(Math.abs(e2)/ed-wd+1)));
					if (x0 == x1) break;
					e2 = err; err -= dy; x0 += sx; 
				} 
				if (2*e2 <= dy) { /* y step */
					for (e2 = dx-e2; e2 < ed*wd && (x1 != x2 || dx < dy); e2 += dy)
						this.pixel(layer, x2 += sx, y0, Math.max(0,255 - 255*(Math.abs(e2)/ed-wd+1)));
					if (y0 == y1) break;
					err += dx; y0 += sy; 
				}
			}

			this.circle(layer, x0, y0, Sketchfull.options.width/2);
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
		},
		circle(layer, x, y, r) {
			r = Math.round(r);

			for(var i = -r-1; i < r+1; i++) {
				var height = Math.sqrt(r * r - i * i);

				for (var j = Math.floor(-height); j < Math.ceil(height); j++)
					this.pixel(layer, x + i, y + j, Math.clamp(height - Math.abs(j), 0, 1) * 255);
			}
		},
		pixel(layer, x, y, alpha) {
			// console.log(layer, x, y, alpha);
			layer.data[y * (layer.width * 4) + x * 4 + 0] = (Sketchfull.options.color.r) & 0xff;
			layer.data[y * (layer.width * 4) + x * 4 + 1] = (Sketchfull.options.color.g) & 0xff;
			layer.data[y * (layer.width * 4) + x * 4 + 2] = (Sketchfull.options.color.b) & 0xff;
			layer.data[y * (layer.width * 4) + x * 4 + 3] = Math.max(layer.data[y * (layer.width * 4) + x * 4 + 3], alpha & 0xff);
		}
	},
	options: {
		color: [0, 0, 0, 0xff],
		width: 10
	},
	touches:{},
	transform: {x: 0, y: 50},
	zoom: 1,

	Update(timestamp) {
		Sketchfull.canvas.context.clearRect(0, 0, Sketchfull.canvas.width, Sketchfull.canvas.height);
		Sketchfull.canvas.context.putImageData(Sketchfull.layers[0], 0, 0);
		window.requestAnimationFrame(Sketchfull.Update);
	},

	Init() {
		$(".dropdown-button").dropdown();
		$(".resizable").resizable();
		$(".draggable").draggable({handle: ".draggable-handle"});
		$(".colpick").colpick({
			color: "123456",
			flat: true,
			onChange: function(hsb, hex, rgb, el, bySetColor) {
				Sketchfull.options.color = rgb
			}
		});

		Sketchfull.canvas = $("#sketch-canvas")[0];
		Sketchfull.canvas.width = 800;
		Sketchfull.canvas.height = 800;
		Sketchfull.canvas.isMouseDown = false;
		Sketchfull.canvas.context = Sketchfull.canvas.getContext("2d");

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
			Sketchfull.canvas.style.top  = Sketchfull.transform.y + "%";
			Sketchfull.canvas.style.width  = Sketchfull.zoom * Sketchfull.layers[0].width + "px";
			Sketchfull.canvas.style.height  = Sketchfull.zoom * Sketchfull.layers[0].height + "px";
		});

		Sketchfull.canvas.addEventListener("mousedown", e => {
			Sketchfull.canvas.isMouseDown = true;
		});

		Sketchfull.canvas.addEventListener("touchstart", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
			}
		});

		Sketchfull.canvas.addEventListener("mousemove", e => {
			if(Sketchfull.canvas.isMouseDown) {
				Sketchfull.tools.linepixel(
					Sketchfull.layers[0],
					(e.offsetX - e.movementX) / e.srcElement.offsetWidth * Sketchfull.layers[0].width,
					(e.offsetY - e.movementY) / e.srcElement.offsetHeight * Sketchfull.layers[0].height,
					e.offsetX / e.srcElement.offsetWidth * Sketchfull.layers[0].width,
					e.offsetY / e.srcElement.offsetHeight * Sketchfull.layers[0].height
				);
			}
		});

		Sketchfull.canvas.addEventListener("touchmove", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				e.preventDefault();
				Sketchfull.tools.linepixel(
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
			Sketchfull.canvas.isMouseDown = false;
		});

		Sketchfull.canvas.addEventListener("mouseout", e => {
			Sketchfull.canvas.isMouseDown = false;
		});

		Sketchfull.canvas.addEventListener("touchend", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
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
	},

	ResetZoom() {
		Sketchfull.zoom = 1;
		Sketchfull.transform = {x: 0, y: 50};

		Sketchfull.canvas.style.left = Sketchfull.transform.x + "%";
		Sketchfull.canvas.style.top  = Sketchfull.transform.y + "%";
		Sketchfull.canvas.style.width  = Sketchfull.zoom * Sketchfull.layers[0].width + "px";
		Sketchfull.canvas.style.height  = Sketchfull.zoom * Sketchfull.layers[0].height + "px";
	},

	Clear() {
		Sketchfull.layers = [new ImageData(500, 500)];
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