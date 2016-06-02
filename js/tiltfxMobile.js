/**
 * tiltfx.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2015, Codrops
 * http://www.codrops.com
 */
;(function(window) {
	
	'use strict';

	/**
	 * **************************************************************************
	 * utils
	 * **************************************************************************
	 */
	
	// from https://gist.github.com/desandro/1866474
	var lastTime = 0;
	var prefixes = 'webkit moz ms o'.split(' ');
	// get unprefixed rAF and cAF, if present
	var requestAnimationFrame = window.requestAnimationFrame;
	var cancelAnimationFrame = window.cancelAnimationFrame;
	// loop through vendor prefixes and get prefixed rAF and cAF
	var prefix;
	var posx, posy;

	for( var i = 0; i < prefixes.length; i++ ) {
		if ( requestAnimationFrame && cancelAnimationFrame ) {
			break;
		}
		prefix = prefixes[i];
		requestAnimationFrame = requestAnimationFrame || window[ prefix + 'RequestAnimationFrame' ];
		cancelAnimationFrame  = cancelAnimationFrame  || window[ prefix + 'CancelAnimationFrame' ] ||
		window[ prefix + 'CancelRequestAnimationFrame' ];
	}

	// fallback to setTimeout and clearTimeout if either request/cancel is not supported
	if ( !requestAnimationFrame || !cancelAnimationFrame ) {
		requestAnimationFrame = function( callback, element ) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
			var id = window.setTimeout( function() {
				callback( currTime + timeToCall );
			}, timeToCall );
			lastTime = currTime + timeToCall;
			return id;
		};

		cancelAnimationFrame = function( id ) {
			window.clearTimeout( id );
		};
	}

	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	// from http://www.quirksmode.org/js/events_properties.html#position
	function getMousePos(e) {
		posx = 0;
		posy = 0;
		if (!e) var e = window.event;
		if (e.pageX || e.pageY) 	{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY) 	{
			posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		return {
			x : posx,
			y : posy
		}

	}

	// from http://www.sberry.me/articles/javascript-event-throttling-debouncing
	function throttle(fn, delay) {
		var allowSample = true;

		return function(e) {
			if (allowSample) {
				allowSample = false;
				setTimeout(function() { allowSample = true; }, delay);
				fn(e);
			}
		};
	}

	/***************************************************************************/

	/**
	 * TiltFx fn
	 */
	function TiltFx(el, options) {
		this.el = el;
		this.options = extend( {}, this.options );
		extend( this.options, options );
		this._init();
		this._initEvents();

		// this.enabled = false;
	    this.ix = 0;
	    this.iy = 0;
	    this.iz = 0;
	}


	/**
	 * TiltFx options.
	 */
	TiltFx.prototype.options = {
		// number of extra image elements (div with background-image) to add to the DOM - min:1, max:5 (for a higher number, it's recommended to remove the transitions of .tilt__front in the stylesheet.
		extraImgs : 2,
		// the opacity value for all the image elements.
		opacity : 0.7,
		// by default the first layer does not move.
		bgfixed : true,
		// image element's movement configuration
		movement : {
			perspective : 1000, // perspective value
			translateX : -10, // a relative movement of -10px to 10px on the x-axis (setting a negative value reverses the direction)
			translateY : -10, // a relative movement of -10px to 10px on the y-axis 
			translateZ : 20, // a relative movement of -20px to 20px on the z-axis (perspective value must be set). Also, this specific translation is done when the mouse moves vertically.
			rotateX : 2, // a relative rotation of -2deg to 2deg on the x-axis (perspective value must be set)
			rotateY : 2, // a relative rotation of -2deg to 2deg on the y-axis (perspective value must be set)
			rotateZ : 0 // z-axis rotation; by default there's no rotation on the z-axis (perspective value must be set)
		}
	}

	TiltFx.prototype.motionSupport = !!window.DeviceMotionEvent;
	TiltFx.prototype.orientationSupport = !!window.DeviceOrientationEvent;
	TiltFx.prototype.orientationStatus = 0;


	/**
	 * Initialize: build the necessary structure for the image elements and replace it with the HTML img element.
	 */
	TiltFx.prototype._init = function() {
		this.tiltWrapper = document.createElement('div');
		this.tiltWrapper.className = 'tilt';

		// main image element.
		this.tiltImgBack = document.createElement('div');
		this.tiltImgBack.className = 'tilt__back';
		this.tiltImgBack.style.backgroundImage = 'url(' + this.el.src + ')';
		this.tiltWrapper.appendChild(this.tiltImgBack);

		// image elements limit.
		if( this.options.extraImgs < 1 ) {
			this.options.extraImgs = 1;
		}
		else if( this.options.extraImgs > 5 ) {
			this.options.extraImgs = 5;
		}

		if( !this.options.movement.perspective ) {
			this.options.movement.perspective = 0;
		}

		// add the extra image elements.
		this.imgElems = [];
		for(var i = 0; i < this.options.extraImgs; ++i) {
			var el = document.createElement('div');
			el.className = 'tilt__front';
			el.style.backgroundImage = 'url(' + this.el.src + ')';
			el.style.opacity = this.options.opacity;
			this.tiltWrapper.appendChild(el);
			this.imgElems.push(el);
		}

		if( !this.options.bgfixed ) {
			this.imgElems.push(this.tiltImgBack);
			++this.options.extraImgs;
		}

		// add it to the DOM and remove original img element.
		this.el.parentNode.insertBefore(this.tiltWrapper, this.el);
		this.el.parentNode.removeChild(this.el);

		// tiltWrapper properties: width/height/left/top
		this.view = { width : this.tiltWrapper.offsetWidth, height : this.tiltWrapper.offsetHeight };
		//this.enable();
	};
 
	/**
	 * Initialize the events on the main wrapper.
	 */

	// TiltFx.prototype.enable = function() {
 //    if (!this.enabled) {
 //      this.enabled = true;
 //      if (this.orientationSupport) {

 //      	console.log("enable orientation support");
 //        window.addEventListener('deviceorientation', this.onDeviceOrientation);
       
 //      } else {


 //      	console.log("enable mouse move");
 //        window.addEventListener('mousemove', this.onMouseMove);
 //      }
 //      window.addEventListener('resize', this.onWindowResize);
      
 //    }
 //  };



	TiltFx.prototype._initEvents = function() {

		var self = this,
			moveOpts = self.options.movement;

		     
		// this.tiltWrapper.addEventListener('mousemove', this.onMouseMove);  

			this.tiltWrapper.addEventListener('mousemove',function(ev){

				requestAnimationFrame(function() {
						// mouse position relative to the document.
					var mousepos = getMousePos(ev),
						docScrolls = {left : document.body.scrollLeft + document.documentElement.scrollLeft, top : document.body.scrollTop + document.documentElement.scrollTop},
					    bounds = self.tiltWrapper.getBoundingClientRect(),
					
							// mouse position relative to the main element (tiltWrapper).
						relmousepos = {
							x : mousepos.x - bounds.left - docScrolls.left,
							y : mousepos.y - bounds.top - docScrolls.top
						};

						self.ix = relmousepos.x;
						self.iy = relmousepos.y;



					// configure the movement for each image element.
					for(var i = 0, len = self.imgElems.length; i < len; ++i) {
						var el = self.imgElems[i],
							rotX = moveOpts.rotateX ? 2 * ((i+1)*moveOpts.rotateX/self.options.extraImgs) / self.view.height * self.iy - ((i+1)*moveOpts.rotateX/self.options.extraImgs) : 0,
							rotY = moveOpts.rotateY ? 2 * ((i+1)*moveOpts.rotateY/self.options.extraImgs) / self.view.width * self.ix - ((i+1)*moveOpts.rotateY/self.options.extraImgs) : 0,
							rotZ = moveOpts.rotateZ ? 2 * ((i+1)*moveOpts.rotateZ/self.options.extraImgs) / self.view.width * self.ix - ((i+1)*moveOpts.rotateZ/self.options.extraImgs) : 0,
							transX = moveOpts.translateX ? 2 * ((i+1)*moveOpts.translateX/self.options.extraImgs) / self.view.width * self.ix - ((i+1)*moveOpts.translateX/self.options.extraImgs) : 0,
							transY = moveOpts.translateY ? 2 * ((i+1)*moveOpts.translateY/self.options.extraImgs) / self.view.height * self.iy - ((i+1)*moveOpts.translateY/self.options.extraImgs) : 0,
							transZ = moveOpts.translateZ ? 2 * ((i+1)*moveOpts.translateZ/self.options.extraImgs) / self.view.height * self.iy - ((i+1)*moveOpts.translateZ/self.options.extraImgs) : 0;

						el.style.WebkitTransform = 'perspective(' + moveOpts.perspective + 'px) translate3d(' + transX + 'px,' + transY + 'px,' + transZ + 'px) rotate3d(1,0,0,' + rotX + 'deg) rotate3d(0,1,0,' + rotY + 'deg) rotate3d(0,0,1,' + rotZ + 'deg)';
						el.style.transform = 'perspective(' + moveOpts.perspective + 'px) translate3d(' + transX + 'px,' + transY + 'px,' + transZ + 'px) rotate3d(1,0,0,' + rotX + 'deg) rotate3d(0,1,0,' + rotY + 'deg) rotate3d(0,0,1,' + rotZ + 'deg)';
					}
				});
			});

			// reset all when mouse leaves the main wrapper.
			//this.tiltWrapper.addEventListener('mouseleave', this.onMouseleave);
			this.tiltWrapper.addEventListener('mouseleave', function(event){
				setTimeout(function() {
				for(var i = 0, len = self.imgElems.length; i < len; ++i) {
					var el = self.imgElems[i];
					el.style.WebkitTransform = 'perspective(' + moveOpts.perspective + 'px) translate3d(0,0,0) rotate3d(1,1,1,0deg)';
					el.style.transform = 'perspective(' + moveOpts.perspective + 'px) translate3d(0,0,0) rotate3d(1,1,1,0deg)';
				}	
				}, 60);
				
			});


	        window.addEventListener('devicemotion', throttle(function(ev){

	        	requestAnimationFrame(function() {

		        	var accel = deviceMotionHandler(ev),

			        x = self.map_range(accel.x, -1, 1, 0, self.view.width),
				    y = self.map_range(accel.y, -1, 1, 0, self.view.height),
				    z = self.map_range(accel.z, -1, 1, 0, self.view.height);

		        	self.ix = x;
					self.iy = y;
					self.iz = z;

					self.ix = self.clamp(self.ix, 0, self.view.width);
					self.iy = self.clamp(self.iy, 0, self.view.height);
					self.iz = self.clamp(self.iz, 0, self.view.height);


					
					// console.log(self.ix + " " + self.iy + " " + self.iz);

					for(var i = 0, len = self.imgElems.length; i < len; ++i) {
						var el = self.imgElems[i],
							rotX = moveOpts.rotateX ? 2 * ((i+1)*moveOpts.rotateX/self.options.extraImgs) / self.view.height * self.iy - ((i+1)*moveOpts.rotateX/self.options.extraImgs) : 0,
							rotY = moveOpts.rotateY ? 2 * ((i+1)*moveOpts.rotateY/self.options.extraImgs) / self.view.width * self.ix - ((i+1)*moveOpts.rotateY/self.options.extraImgs) : 0,
							rotZ = moveOpts.rotateZ ? 2 * ((i+1)*moveOpts.rotateZ/self.options.extraImgs) / self.view.width * self.iz - ((i+1)*moveOpts.rotateZ/self.options.extraImgs) : 0,
							transX = moveOpts.translateX ? 2 * ((i+1)*moveOpts.translateX/self.options.extraImgs) / self.view.width * self.ix - ((i+1)*moveOpts.translateX/self.options.extraImgs) : 0,
							transY = moveOpts.translateY ? 2 * ((i+1)*moveOpts.translateY/self.options.extraImgs) / self.view.height * self.iy - ((i+1)*moveOpts.translateY/self.options.extraImgs) : 0,
							transZ = moveOpts.translateZ ? 2 * ((i+1)*moveOpts.translateZ/self.options.extraImgs) / self.view.height * self.iz - ((i+1)*moveOpts.translateZ/self.options.extraImgs) : 0;

						el.style.WebkitTransform = 'perspective(' + moveOpts.perspective + 'px) translate3d(' + transX + 'px,' + transY + 'px,' + transZ + 'px) rotate3d(1,0,0,' + rotX + 'deg) rotate3d(0,1,0,' + rotY + 'deg) rotate3d(0,0,1,' + rotZ + 'deg)';
						el.style.transform = 'perspective(' + moveOpts.perspective + 'px) translate3d(' + transX + 'px,' + transY + 'px,' + transZ + 'px) rotate3d(1,0,0,' + rotX + 'deg) rotate3d(0,1,0,' + rotY + 'deg) rotate3d(0,0,1,' + rotZ + 'deg)';
					}
				});
		    }, 100));

				
			// window resize
			window.addEventListener('resize', throttle(function(ev) {
				// recalculate tiltWrapper properties: width/height/left/top
				self.view = { width : self.tiltWrapper.offsetWidth, height : self.tiltWrapper.offsetHeight };
			}, 50));

		};


		TiltFx.prototype.map_range = function(value, low1, high1, low2, high2) {
		    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
		}

		TiltFx.prototype.clamp = function(value, min, max) {
		    value = Math.max(value, min);
		    value = Math.min(value, max);
		    return value;
		  };
				
		function deviceMotionHandler(ev) {

			    var rotationrate = ev.rotationRate;
			    var acceleration = ev.accelerationIncludingGravity;

			    var rotatex = rotationrate.beta,
				    rotatey = rotationrate.gamma,
				    rotatez = rotationrate.alpha;
				
				var x,y,z;

				    x = rotatex,
				    y = rotatey,
					z = rotatez;
			
		    return {
		       	x, y, z
		       }
			  			
			}

	function init() {
		// search for imgs with the class "tilt-effect"
		[].slice.call(document.querySelectorAll('img.tilt-effect')).forEach(function(img) {
			new TiltFx(img, JSON.parse(img.getAttribute('data-tilt-options')));
		});
	}

	init();

	window.TiltFx = TiltFx;

})(window);