'use strict';

/*

TODO (in order)
	1. Compile C to WASM and set up AutoHotkey so that Windows + C compiles to C correctly again
	2. Compile the current WASM file, because some of it needs updated to work right here
	3. Start moving movement code and frame tracking into the C file and out of here (initial goal is getting this file down to 250 lines)

*/

modules.avatars = new function(){
	const module	= this;
	module.name		= 'avatars';
	module.root		= modules[module.name];
	module.path		= '../' + module.name;
	module.isAdminPanel	= (module.root.querySelector('#is-admin') != null);
	
	// We don't do anything on admin panel
	if(module.isAdminPanel)
		return;
	
	// Use Root to call elements (with getElementById, querySelector, and querySelectorAll)
	
	///////////////////
	//// CONSTANTS ////
	///////////////////

	const CANVAS				= module.root.getElementById('canvas');
	const CTX					= CANVAS.getContext('2d');
	CTX.imageSmoothingEnabled	= false; // Our pixel art will look trash without this

	///////////////////
	//// VARIABLES ////
	///////////////////

	// Sprites
	var emotes					= {};
	var avatarSpriteSheet		= new Image();
	avatarSpriteSheet.src		= module.path + '/avatars.png';

	// Other
	var chatterMes				= {};
	var userData				= {};

	module.WASM					= null;
	module.WASMValues			= {};

	// module.entities
	module.entities				= {
		graphic		: []
		,other		: []
	};

	var lastFrameTimestamp		= 0;

	var context = new AudioContext(), oscillator;
	var volumeNodes = context.createGain();
	volumeNodes.connect(context.destination);
	volumeNodes.gain.value = .1; // These are loud, so we're limiting them hard

	const DATA_TYPES			= {
		'char'		:	'Int8'
		,'short'	:	'Int16'
		,'int'		:	'Int32'
		,'float'	:	'Float32'
	};

	///////////////////
	//// FUNCTIONS ////
	///////////////////

	// The Loop
	function onAnimationFrame(frameTimestamp) {
		// Delta time, based on seconds
		var deltaTime = (frameTimestamp - lastFrameTimestamp) / 1000;
		
		lastFrameTimestamp = frameTimestamp;

		// module.WASM processes the movement calculations //
		module.WASM.loopEntities(deltaTime,false/*(currentScene !== 'live')*/);
		
		// JS processes drawing the module.entities onto the canvas //
		
		// Offsets the transformations; we use this to restore settings at the end
		CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
		var canvasOffsetX	= 0;
		var canvasOffsetY	= 0;
		for(var i = 0; i < module.WASMValues.ENTITY_MAX; i ++){
			if(module.WASMValues.eType[i] === 0) continue;
			
			// Move the context to center the element for drawing
			CTX.translate(
				module.WASMValues.eX[i] - canvasOffsetX
				,module.WASMValues.eY[i] - canvasOffsetY
			);
			// Rotate the context for drawing
			if(module.WASMValues.eRot[i] !== 0) CTX.rotate((module.WASMValues.eRot[i] * Math.PI / 180));
			
			// Save the current canvas offset
			canvasOffsetX = module.WASMValues.eX[i];
			canvasOffsetY = module.WASMValues.eY[i];
			
			switch(module.WASMValues.eType[i]){
				// Me
				case module.WASMValues.TYPE_ME:
					// Figure out run frame
					if(module.WASMValues.eSpeedX[i] !== 0 || module.WASMValues.eSpeedY[i] !== 0){
						module.entities.other[i].frame += 110 * deltaTime;
						
						// Look at flipping if moving left or right
						if(module.WASMValues.eSpeedX[i] > 0) module.entities.other[i].flip = false;
						else if(module.WASMValues.eSpeedX[i] < 0) module.entities.other[i].flip = true;
					// Figure out frame if not moving
					} else
						module.entities.other[i].frame = 0;
					
					// Loop back to frame 0 if we've exceeded the max
					if(module.entities.other[i].frame > 60) module.entities.other[i].frame = 0;
					
					// If we've got negative speed and are moving horizontally, set image position based on this
					if(module.entities.other[i].moveSpeed < 0 && module.WASMValues.eSpeedX[i] !== 0) module.entities.other[i].flip = !module.entities.other[i].flip;
					
					// Set up the sprite for drawing
					var img = module.entities.graphic[i];
					var frame = (module.entities.other[i].frame < 30) ? 0 : 1; // Choose frame based on time
					
					// Flip the canvas if we need to flip the image
					// if(module.entities.other[i].flip === true) CTX.scale(-1,1);
					// Go to the mirrored frames if we need to
					if(module.entities.other[i].flip === true) frame += 2;
					
					// Get the position of the image and draw it. Position in image is based on sprite number, frame number, and considers padding that exists between images (to prevent bleeding that is inherent to every number being a float in JS)
					CTX.drawImage(
						avatarSpriteSheet
						,(frame * module.WASMValues.SPRITE_SIZE) + frame
						,(img * module.WASMValues.SPRITE_SIZE) + img
						,module.WASMValues.SPRITE_SIZE
						,module.WASMValues.SPRITE_SIZE
						,-(module.WASMValues.SPRITE_SIZE * module.WASMValues.DRAW_SCALE / 2)
						,-(module.WASMValues.SPRITE_SIZE * module.WASMValues.DRAW_SCALE / 2)
						,module.WASMValues.SPRITE_SIZE * module.WASMValues.DRAW_SCALE
						,module.WASMValues.SPRITE_SIZE * module.WASMValues.DRAW_SCALE
					);
					
					// Flip the canvas if we need to flip the image
					// if(module.entities.other[i].flip === true) CTX.scale(-1,1);
					break;
				// Emotes
				case module.WASMValues.TYPE_EMOTE:
					if(!isNaN(module.entities.graphic[i])) break;
					
					// Max width is 56, get a good width this way
					var sizeMultiplier = 56 / (module.entities.graphic[i].width || 28);
					
					var width = (module.entities.graphic[i].width || 28) * sizeMultiplier;
					var height = (module.entities.graphic[i].height || 28) * sizeMultiplier;
					
					CTX.drawImage(
						module.entities.graphic[i]
						,-(width / 2)
						,-(height / 2)
						,width
						,height
					);
					break;
				default:
					break;
			}
			
			// Rotate the canvas back to its correct state
			if(module.WASMValues.eRot[i] !== 0) CTX.rotate(-(module.WASMValues.eRot[i] * Math.PI / 180));
		}
		
		// Recenter the canvas context after performing all of the operations
		CTX.translate(-canvasOffsetX,-canvasOffsetY);
		
		// Play synth notes queued by C
		for(var s = 0, l = module.WASMValues.sNote.length; s < l; s ++){
			if(module.WASMValues.sNote[s] == 0) break;
			
			notePlay(
				module.WASMValues.sNote[s]
				,module.WASMValues.sDelay[s]
				,module.WASMValues.sDuration[s]
				,1
			);
			module.WASMValues.sNote[s] = 0; // Disable the notes
		}
		
		window.requestAnimationFrame(onAnimationFrame);
	}

	function notePlay(halfsteps = 0,start = 0,length = .5) {
		// Don't try to play notes in the past
		if(context.currentTime + start < 0) return;
		
		// https://pages.mtu.edu/~suits/NoteFreqCalcs.html
		var a4			= 440; // the frequency of A4
		var a			= 1.059463094359; // The 12th root of 2

		var hz			= a4 * Math.pow(a,halfsteps);

		var oscillator = context.createOscillator();
		oscillator.type = 'square';
		oscillator.frequency.value = hz;
		oscillator.connect(volumeNodes);
		oscillator.start(context.currentTime + start);
		
		// If length is 0, this could go on forever
		if(length > 0) oscillator.stop(context.currentTime + start + length);
		
		return oscillator;
	}

	async function initializeFiles(initialLoad = true){
		var cText = null;
		
		// Load C File to get all constants and put them into JS
		var promise1 = fetch(module.path + '/script.c')
		.then(response => response.text())
		.then(text => {cText = text;});
		
		// Load module.WASM
		var promise2 = fetch(module.path + '/script.wasm',{headers:{'Content-Type':'application/wasm'}})
		.then(response => response.arrayBuffer())
		.then(bits => WebAssembly.instantiate(bits))
		.then(obj => {module.WASM = obj.instance.exports;});
		
		// Wait for both C and module.WASM to resolve
		await Promise.all([promise1,promise2]);
		
		// Set all constants
		var regex = /[\n\r]const\s+(?:(char|short|int|float)\s+)?([^\s]+)\s*=\s*([^;f]+)\s*f?;/gi;
		var results;
		
		while((results = regex.exec(cText)) !== null){
			// console.log(results);
			// Only floats would be parsed as floats
			if(results[1] === 'float')
				module.WASMValues[results[2]] = parseFloat(results[3]);
			else
				module.WASMValues[results[2]] = parseInt(results[3]);
		}

		// On reload, copy values (don't just reference them)
		if(!initialLoad) var WASMPreviousValues = {...module.WASMValues};
		
		// Get all arrays and share them with JS (avoid struct calls)
		regex = /[\n\r](char|short|int|float)\s+([^\}\[;]+)\[([^\}\];]+)\];/gi;
		var results;
		
		while((results = regex.exec(cText)) !== null){
			var length = isNaN(results[3]) ? module.WASMValues[results[3]] : parseInt(results[3]);
			
			module.WASMValues[results[2]] = new window[DATA_TYPES[results[1]] + 'Array'](module.WASM.memory.buffer,module.WASM[results[2]].value,length);
		}
	}
	
	function createEntity(settings){
		for(var i = (settings.minDepth || 0); i < module.WASMValues.ENTITY_MAX; i ++){
			if(module.WASMValues.eType[i] != 0) continue;
			
			// Create the entity
			module.WASMValues.eX[i]			= settings.x		|| 0;
			module.WASMValues.eY[i]			= settings.y		|| 0;
			module.WASMValues.eSpeedX[i]		= settings.speedX	|| 0;
			module.WASMValues.eSpeedY[i]		= settings.speedY	|| 0;
			module.WASMValues.eRot[i]			= settings.rot		|| 0;
			module.WASMValues.eRotSpeed[i]	= settings.rotSpeed	|| 0;
			module.WASMValues.eType[i]		= settings.type		|| 0;
			module.entities.graphic[i]		= settings.graphic	|| 0;
			module.entities.other[i]		= settings.other	|| {};
			module.WASMValues.eTimer[i]		= settings.timer	|| 0;
			
			return i;
		}
		
		return null;
	}
	
	// Test out a bunch of !mes onscreen
	async function testMes(number){
		var i = isNaN(number) ? 0 : parseInt(number);
			for(i; i > 0; i--){
				var fakeId = Math.random();
				createMe(fakeId);
				me(
					fakeId,
					['up','down','left','right'][Math.floor(Math.random() * 4)]
				);
		}
		
		console.log('Initiated ' + number + ' !mes');
	}
	
	//// !mes ////
	function createMe(userId){
		if(typeof(chatterMes[userId]) !== 'undefined') return null;
		
		// Start at a random Y if on a crawling screen; if on the live stream, start high up so you can fall into the group with the others
		var yPos = (Math.random() * CANVAS.height / 4);
		
		// Add the chatter if they don't exist
		var newMe = createEntity({
			x			: (Math.random() * CANVAS.width)
			,y			: yPos
			,type		: 1
			,graphic	: (userData[userId] ? userData[userId].me_id : 0)
			,timer		: 0
			,other		: {
				frame			: 0
				,flip			: (Math.random() > .5) ? true : false
				,moveSpeed		: 100
			}
		});
		
		if(newMe === null){
			// TODO: Notify the user that we need more time!
			return null;
		}
		
		chatterMes[userId] = newMe;
		return newMe;
	}
	
	function me(user_id,command){
		createMe(user_id);
		
		var moveSpeed = module.entities.other[chatterMes[user_id]].moveSpeed;

		switch(command){
			case 'w':
			case 'up':
				// If on the ground, jump
				if(module.WASMValues.eY[chatterMes[user_id]] === CANVAS.height - (module.WASMValues.SPRITE_SIZE * module.WASMValues.DRAW_SCALE / 2))
					module.WASM.meJump(chatterMes[user_id]);
				break;
			case 's':
			case 'down':
				module.WASMValues.eSpeedX[chatterMes[user_id]] = 0;
				break;
			case 'a':
			case 'left':
				module.WASMValues.eSpeedX[chatterMes[user_id]] = -moveSpeed;
				break;
			case 'd':
			case 'right':
				module.WASMValues.eSpeedX[chatterMes[user_id]] = moveSpeed;
				break;
			case 'stop':
				module.WASMValues.eSpeedX[chatterMes[user_id]] = 0;
				module.WASMValues.eSpeedY[chatterMes[user_id]] = 0;
				break;
			case 'delete':
				module.WASMValues.eType[chatterMes[user_id]] = 0;
				delete chatterMes[user_id];
				break;
			default:
				break;
		}
	}

	async function start(){
		await initializeFiles();
		window.requestAnimationFrame(onAnimationFrame); // Start the loop		
		await testMes(10);
	}

	/////////////////
	///// START /////
	/////////////////

	start();
}