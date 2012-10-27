function VoxelField(dI, dJ) 
{
	this.dimI = dI;
	this.dimJ = dJ;
	this.totalSize = this.dimI*this.dimJ;
	this.maximum = 100;
	this.isovalue = 50;
	try {
		this.values = new Uint8Array(new ArrayBuffer(this.totalSize));
	}
	catch (err){
		throw "Not supported";
	}
	this.caseVertex = [
		[], //Case 0
		[0, 0.5,
		 0.5, 1], //Case 1
		[1, 0.5,
 		 0.5, 1], //Case 2
		[0, 0.5,
		 1, 0.5], //Case 3
		[0.5, 0,
 		 1, 0.5], //Case 4
 		 [0, 0.5,
		 0.5, 0,
		 0.5, 1,
		 1, 0.5], //Case 5
		[0.5, 0,
		0.5, 1],  //Case 6
		[0, 0.5,
		 0.5, 0], //Case 7
		[0, 0.5,
		 0.5, 0], //Case 8
		[0.5, 0,
		0.5, 1],
		[0, 0.5,
		 0.5, 1,
		 0.5, 0,
		 1, 0.5], //Case 10
		[0.5, 0,
		 1, 0.5], //Case 11
		[0, 0.5,
		 1, 0.5], //Case 12
		[1, 0.5,
 		 0.5, 1], //Case 13,
		[0, 0.5,
		 0.5, 1], //Case 14
		[]
	]
}
VoxelField.prototype.set = function(i, j, val)
{
	if (!(0<=i<this.dimI))
		throw "Parameter i out of range";
	if (!(0<=j<this.dimJ))
		throw "Parameter j out of range";
	this.values[i*this.dimJ+j] = val;
}
VoxelField.prototype.setId = function(i, val)
{
	this.set(Math.floor(i/this.dimJ), i%this.dimJ, val);
}
VoxelField.prototype.get = function(i, j)
{
	if (!(0<=i<this.dimI))
		throw "Parameter i out of range";
	if (!(0<=j<this.dimJ))
		throw "Parameter j out of range";
	return this.values[i*this.dimJ+j];
}
VoxelField.prototype.getId = function (i)
{
	return this.get( Math.floor(i/this.dimJ), i%this.dimJ);
}
VoxelField.prototype.getCaseVertices = function(i, j)
{
	if (!(0<=i<this.dimI-1))
		throw "Parameter i = "+i+" out of range [0, "+(this.dimI-1)+")";
	if (!(0<=j<this.dimJ-1))
		throw "Parameter j = "+j+" out of range";
	var values = this.values;
	var isovalue = this.isovalue;
	var dimJ = this.dimJ;
	function thresholded(i, j)
	{
		return (values[i*dimJ+j]>isovalue)?1:0;
	}
	vertices = this.caseVertex[thresholded(i, j+1)+thresholded(i+1, j+1)*2+ thresholded(i+1, j)*4 + thresholded(i, j)*8];
	return this.interpolate(i, j,vertices);
}
VoxelField.prototype.interpolate = function(i, j, vertices)
{
	ret = [];
	values = this.values;
	iso = this.isovalue;
	max = this.maximum;
	dimJ = this.dimJ;
	for (n = 0; n<vertices.length; n+=2)
	{
		x = vertices[n];
		y = vertices[n+1];
		if (y==0.5)
		{
			y = 1+(values[(i+x)*dimJ+j+1]-iso)/(values[(i+x)*dimJ+j]-values[(i+x)*dimJ+j+1]);
		}
		else if (x==0.5)
		{
			x = 1+(values[(i+1)*dimJ+(j+y)]-iso)/(values[i*dimJ+(j+y)]-values[(i+1)*dimJ+(j+y)]);
		}
		ret.push(x, y);
	}
	return ret;
}

//Webgl Detector: source: https://github.com/mrdoob/three.js/blob/master/examples/js/Detector.js
var Detector = {

	canvas: !! window.CanvasRenderingContext2D,
	webgl: ( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )(),
	workers: !! window.Worker,
	fileapi: window.File && window.FileReader && window.FileList && window.Blob,

	getWebGLErrorMessage: function () {

		var element = document.createElement( 'div' );
		element.id = 'webgl-error-message';
		element.style.fontFamily = 'monospace';
		element.style.fontSize = '13px';
		element.style.fontWeight = 'normal';
		element.style.textAlign = 'center';
		element.style.background = '#fff';
		element.style.color = '#000';
		element.style.padding = '1.5em';
		element.style.width = '400px';
		element.style.margin = '5em auto 0';

		if ( ! this.webgl ) {

			element.innerHTML = window.WebGLRenderingContext ? [
				'Tu placa grafica no parece soportar <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
				'Podes averiguar como conseguirlo <a href="http://get.webgl.org/" style="color:#000">aca</a>.'
			].join( '\n' ) : [
				'Tu browser no parece soportar <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>',
				'Podes averiguar como conseguirlo <a href="http://get.webgl.org/" style="color:#000">aca</a>.'
			].join( '\n' );

		}

		return element;

	},

	addGetWebGLMessage: function ( parameters ) {

		var parent, id, element;

		parameters = parameters || {};

		parent = parameters.parent !== undefined ? parameters.parent : document.body;
		id = parameters.id !== undefined ? parameters.id : 'oldie';

		element = Detector.getWebGLErrorMessage();
		element.id = id;

		parent.appendChild( element );

	}

};
	
var renderer = (function($)
{
	var scene, camera, renderer, field;
	var renderMarching = true;
	var renderVoxel = true;
	var cameraSize = 100;
	

	function render()
	{
		var material = new THREE.LineBasicMaterial({color:  0x000000,});
		var marchingCubeGeometry = new THREE.Geometry();
		
		var scale = cameraSize/Math.max(field.dimI-1, field.dimJ-1);
		
		scene = new THREE.Scene(); 
		
		if (renderMarching) {
			for (i = 0; i<field.dimI-1; i++)
			{
				for (j=0; j<field.dimJ-1; j++)
				{
					vertices = field.getCaseVertices(i, j);
					for (n=0; n<vertices.length; n+=2)
					{
						v = new THREE.Vector3(scale*(vertices[n]+i), scale*(vertices[n+1]+j), 0);
						marchingCubeGeometry.vertices.push(v);
					}
				}
			}
		}
		if (renderVoxel)
		{
			for (i = 0; i<field.dimI; i++)
			{
				for (j=0; j<field.dimJ; j++)
				{
					var voxelGeometry = new THREE.Geometry();
					var x0 = Math.max(0, (i-0.5)*scale);
					var y0 = Math.max(0, (j-0.5)*scale);
					var x1 = Math.min((field.dimI-1)*scale, (i+0.5)*scale);
					var y1 = Math.min((field.dimJ-1)*scale, (j+0.5)*scale);
					
					voxelGeometry.vertices.push(new THREE.Vector3(x0,y0,-10));
					voxelGeometry.vertices.push(new THREE.Vector3(x0,y1,-10));
					voxelGeometry.vertices.push(new THREE.Vector3(x1,y1,-10));
					voxelGeometry.vertices.push(new THREE.Vector3(x1,y0,-10));
					voxelGeometry.faces.push(new THREE.Face4(0,1,2,3));
					var color = new THREE.Color();
					var voxelIntensity = (field.get(i,j))/field.maximum
					color.setHSV(0.56, voxelIntensity, 1);
					var mesh = new THREE.Mesh(voxelGeometry, new THREE.MeshBasicMaterial({color: color}))
					scene.add(mesh);
				}
			}
		}
		
		if (renderMarching)
		{
		    var line = new THREE.Line(marchingCubeGeometry, material, THREE.LinePieces);
		    scene.add(line);
	   	}
	   

		renderer.render(scene, camera);
	}
	
	function voxelUpdater(voxelId)
	{
		return function() {
			field.setId(voxelId, $(this).val())
			render();
		}
	}
	return {
		init: function (parent, voxelField)
		{
			var parent = $(parent);
			field = voxelField;	
			parent.append(Detector.getWebGLErrorMessage());
			//Create voxel editor
			var table = parent.find('table');
			for (var j = 0; j<field.dimJ; j++)
			{
				var row = document.createElement('tr');
				$(row).attr('id', 'j'+j);
				for (var i = 0; i<field.dimI; i++)
				{
					$(row).append($(document.createElement('td')).attr('id', 'i'+i));
				}
				table.append(row);
			}
			
			for (var i = 0; i<field.totalSize; i++)
			{
				var id = 'v'+i;
				var input = $(document.createElement('input'))
									.attr('id', id)
									.attr('value', field.getId(i))
									.attr('type', 'number')
									.attr('min', 0)
									.attr('max', 100)
									.attr('step', 10);
				parent.find('#j'+i%field.dimJ+' > #i'+Math.floor(i/field.dimJ))
					.append(input);
					
				input.change(voxelUpdater(i));		
			}
			
			//Bind Render Voxels control
			parent.find('#voxel')
					.attr('checked', renderVoxel?"checked":undefined)
					.change(function() { 
						renderVoxel = (typeof ($(this).attr("checked")) !== "undefined");
						render();
					});
			
			//Bind Render Marching Cubes control	
			parent.find('#marching')
					.attr('checked', renderMarching?"checked":undefined)
					.change(function() { 
						renderMarching = (typeof ($(this).attr("checked")) !== "undefined");
						render();
						});
					
			//Add Isovalue control
			parent.find("#isovalue").attr("value", field.isovalue).change(function(){ field.isovalue = $(this).val(); render();});
			
			//Init gl
			camera = new THREE.OrthographicCamera(0, cameraSize, 0, cameraSize, 0, 200);  
			camera.position.set(0, 0, 100);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
			
			//Add webgl widget
			renderer = new THREE.WebGLRenderer(); 
			
	
			renderer.setSize(400, 400); 
			parent.append(renderer.domElement);
			
			render();
		}
	}
})(jQuery);