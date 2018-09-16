Sketchfull.tools = {
	undo: {

	},
	redo: {

	},
	move: {
		switch: true,
		toolbar: '<ul><li><span>Move</span></li></ul>',
		data: {startX: 0, startY: 0},
		Start(layer, x, y) {
			this.data.startX = x;
			this.data.startY = y;
		},
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
		Start(layer, x, y) {
			console.log(x, y);
		},
		Move(layer, x, y, dx, dy) {
		},
		End(layer, x, y) {
		}
	},
	pick: {
		switch: true,
		options: {
			alllayers: false
		},
		toolbar: '<ul><li><span>Color Picker</span></li><li><input type="checkbox" id="sketch-tool-pick-alllayers" checked="unchecked" disabled /><label for="sketch-tool-pick-alllayers">Sample all layers</label></li></ul>',
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
		Start(layer, x, y) {
			console.log(x, y);
		},
		Move(layer, x, y, dx, dy) {
		},
		End(layer, x, y) {
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
		Start(layer, x, y) {
			console.log(x, y);
		},
		Move(layer, x, y, dx, dy) {
		},
		End(layer, x, y) {
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
			size: 20,
		},
		toolbar: '<ul><li><span>Text</span></li><li><span>Font</span></li><li><span>Size</span></li><li><span class="range-field"><input type="range" id="sketch-size" min="1" max="200" /></span></li></ul>',
		Init() {
			$("#sketch-size").val(this.options.size);
			$("#sketch-size").on("change", e => {this.options.size = parseInt(e.target.value)});
		},
		Start(layer, x, y) {
			var text = prompt("Enter text:");
			if(!text) return;

			Sketchfull.layers.splice(Sketchfull.layer+1, 0, {type: "text", visible: true, name: text, x: x, y: y, data: {color: Sketchfull.options.color, size: this.options.size, text: text}});
			Sketchfull.layer += 1;
			Sketchfull.dirty = true;
		}
	},
	line: {
		switch: true,
		options: {
		},
		toolbar: '<ul><li><span>Line</span></li></ul>',
		Start(layer, x, y) {

		},
		Move(layer, x, y, dx, dy) {
		},
		End(layer, x, y) {
		}
	},
	rectangle: {
		switch: true,
		options: {
		},
		toolbar: '<ul><li><span>Rectangle</span></li></ul>',
		Start(layer, x, y) {
			console.log(x, y);
		},
		Move(layer, x, y, dx, dy) {
		},
		End(layer, x, y) {
		}
	},
	circle: {
		switch: true,
		options: {
		},
		toolbar: '<ul><li><span>Circle</span></li></ul>',
		Start(layer, x, y) {
			console.log(x, y);
		},
		Move(layer, x, y, dx, dy) {
		},
		End(layer, x, y) {
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
};
