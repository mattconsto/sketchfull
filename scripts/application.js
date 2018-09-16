// Automatically compile simple templates
$("script.auto-component[type='text/ractive']").each((index, element) => {Ractive.components[element.id] = Ractive.extend({template: element.innerHTML, isolated: false})});

const Sketchfull = {
	canvas: [],
	layers: [
		{type: "bitmap", visible: true, name: "Layer 0", x: 0, y: 0, data: createCanvasOfDimensions(500, 500)}
	],
	layer: 0,
	tools: {},
	options: {
		color: {r: 0, g: 0, b: 255},
		width: 10,
		dimensions: {width: 500, height: 500},
	},
	touches: {},
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
				context.font = layer.data.size + "px Arial";
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
				if(Sketchfull.tools[e.currentTarget.dataset.tool].switch) $("#sketch-toolbar").html(Sketchfull.tools[e.currentTarget.dataset.tool].toolbar);
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
					(e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
					(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y
				);
		});

		Sketchfull.canvas.addEventListener("touchstart", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
				if(Sketchfull.currentTool.Start)
					Sketchfull.currentTool.Start(
						Sketchfull.currentLayer,
						(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / e.changedTouches[i].target.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
						(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y
					);
			}
		});

		window.addEventListener("mousemove", e => {
			if(Sketchfull.isMouseDown) {
				if(Sketchfull.currentTool.Move)
					Sketchfull.currentTool.Move(
						Sketchfull.currentLayer,
						((e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) - e.movementX) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
						((e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) - e.movementY) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y,
						(e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
						(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y
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
						(Sketchfull.touches[e.changedTouches[i].identifier].pageX - Sketchfull.touches[e.changedTouches[i].identifier].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / Sketchfull.touches[e.changedTouches[i].identifier].target.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
						(Sketchfull.touches[e.changedTouches[i].identifier].pageY - Sketchfull.touches[e.changedTouches[i].identifier].target.offsetTop + Sketchfull.touches[e.changedTouches[i].identifier].target.offsetHeight/2) / Sketchfull.touches[e.changedTouches[i].identifier].target.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y,
						(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / e.changedTouches[i].target.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
						(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y
					);
				Sketchfull.touches[e.changedTouches[i].identifier] = e.changedTouches[i];
			}
		});

		Sketchfull.canvas.addEventListener("mouseup", e => {
			Sketchfull.isMouseDown = false;
			if(Sketchfull.currentTool.End)
				Sketchfull.currentTool.End(
					Sketchfull.currentLayer,
					(e.pageX - Sketchfull.canvas.offsetLeft + Sketchfull.canvas.offsetWidth/2) / Sketchfull.canvas.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
					(e.pageY - Sketchfull.canvas.offsetTop + Sketchfull.canvas.offsetHeight/2) / Sketchfull.canvas.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y
				);
		});

		Sketchfull.canvas.addEventListener("touchend", e => {
			for(var i = 0; i < e.changedTouches.length; i++) {
				if(Sketchfull.currentTool.End)
					Sketchfull.currentTool.End(
						Sketchfull.currentLayer,
						(e.changedTouches[i].pageX - e.changedTouches[i].target.offsetLeft + e.changedTouches[i].target.offsetWidth/2) / e.changedTouches[i].target.offsetWidth * Sketchfull.canvas.width - Sketchfull.currentLayer.x,
						(e.changedTouches[i].pageY - e.changedTouches[i].target.offsetTop + e.changedTouches[i].target.offsetHeight/2) / e.changedTouches[i].target.offsetHeight * Sketchfull.canvas.height - Sketchfull.currentLayer.y
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

	Rasterise(layer) {
		var CompositeTextLayer = function(context, layer) {
			context.font = layer.data.size + "px Arial";
			context.fillStyle = "rgb(" + layer.data.color.r + ", " + layer.data.color.g + ", " + layer.data.color.b + ")";
			context.fillText(layer.data.text, layer.x, layer.y);
		}

		layer = typeof value === 'number' ? layer : parseInt(layer);

		if(layer < 0 || layer >= Sketchfull.layers.length) return false;

		switch(Sketchfull.layers[layer].type) {
			case "bitmap": return;
			case "text":
				var canvas = createCanvasOfDimensions(Sketchfull.options.dimensions.width, Sketchfull.options.dimensions.height);
				CompositeTextLayer(canvas.context, Sketchfull.layers[layer]);
				canvas.context.imagedata = canvas.context.getImageData(0, 0, canvas.width, canvas.height);
				Sketchfull.layers[layer] = {type: "bitmap", visible: Sketchfull.layers[layer].visible, name: Sketchfull.layers[layer].name, x: 0, y: 0, data: canvas};
				Sketchfull.dirtyLayers = -1;
				Sketchfull.dirty = true;
				break;
			default:
				console.warn("Cannot rasterise the current layer")
		}

		Sketchfull.dirty = true;
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
			case "bitmap":
				Sketchfull.currentLayer.data.context.clearRect(0, 0, Sketchfull.currentLayer.data.width, Sketchfull.currentLayer.data.height);
				Sketchfull.currentLayer.data.context.imagedata = Sketchfull.currentLayer.data.context.getImageData(0, 0, Sketchfull.currentLayer.data.width, Sketchfull.currentLayer.data.height);
				break;
			default: Sketchfull.layers.splice(Sketchfull.layer, 1); break; // Little point clearing a line or text.
		}
		Sketchfull.dirty = true;
	},

	Download(source, format) {
		source.download = "image." + format.split("/")[1];
		source.href = Sketchfull.canvas.toDataURL(format).replace(/^data:image\/[^;]/, 'data:application/octet-stream');
	},

	Save() {
		var string = "This is my compression test.";
		Sketchfull.Log("Size of sample is: " + string.length);
		var compressed = LZString.compress(string);
		Sketchfull.Log("Size of compressed sample is: " + compressed.length);
		string = LZString.decompress(compressed);
		Sketchfull.Log("Sample is: " + string);
	},

	Print() {
		var printwindow = window.open(Sketchfull.canvas.toDataURL("image/png"), "_blank");
		printwindow.onload = function() {window.print();}
	}
};

// Lets go!
$(document).ready(Sketchfull.Init);
