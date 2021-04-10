'use strict';

/*

System: pick an update from three importance levels, so there's a massive update in each but updates are relatively quick to get out (essentially, so I'm making one easy, medium, and hard update instead of tackling all of the hard updates at once and slowing down update output)

PACKED UPDATES:

Any updates you want to see earlier? Please let me know!

	- Guard against multiple gift subscriptions blowing out eardrums (they'd all trigger at once)
	- Test Subscriptions
	- Test Bits cheers

v1.0.0
	1. Any major bug updates or required changes before launch (based on user feedback)
	2. 

PRIORITY TODO LIST:
	- Add "On End" feature that has a different effect for different options:
		- Stop: stop the animation and return to the start
		- Loop: restart the animation
		- Play Next: go play the next animation
		- Pause At End: pause the animation and freeze at the end
		- Start From Cursor: restart the animation from the cursor's last position
	- Set opacity outside of screen area, so that you can see what it looks with the image out of view or in view; user choice
	- Pull Channel Reward names to use? (might be annoying, if haven't created the Channel Reward yet)

	- On zoom in-out on webpage (ctrl+mouse wheel) don't adjust image size
	- Figure out why opacity won't go down to true 0; create a solution (might be as simple as making the minimum -.01 instead of just 0)
	- Layer Test: see how multiple sound; trigger multiple?
	- Set timeline width to set?; so that it takes up less space if it's shorter? Or would that be annoying?

	- Adjust audio level of clip from inside
	- Add support for .jpg, .svg, .gif, and video files as well
	
FEATURES TO GET FEEDBACK ON
	- "Random Animation" option to create a new randomized animation at the press of a button

*/

'use strict';

modules.viewerimpact = new function(){
	const module	= this;
	module.name		= 'viewerimpact';
	module.root		= modules[module.name];
	module.path		= '../' + module.name;
	
	///////////////////
	//// CONSTANTS ////
	///////////////////

	// NL_CWD doesn't have the slash after the drive letter. Add it to this variable.
	//const PATH				= NL_CWD.replace(/^([A-Z]):/i,'$1:/');

	const HECKLE_SCALE	= 4;

	const SCALE_X		= 0;
	const SKEW_X		= 1;
	const SKEW_Y		= 2;
	const SCALE_Y		= 3;
	const TRANSLATE_X	= 4;
	const TRANSLATE_Y	= 5;
	const OPACITY		= 6;
	const ROTATION		= 7;

	const BODY			= module.root.querySelector('#body');
	const MAIN			= module.root.querySelector('main');

	const CANVAS		= module.root.getElementById('scrubber');
	const CTX			= CANVAS.getContext('2d');

	///////////////////
	//// VARIABLES ////
	///////////////////

	var saveData = {};
	var currentPath				= null;

	var heckleSound				= new Audio();
	heckleSound.preload			= true;
	heckleSound.autoplay		= true;

	var visualizerAudio			= new (window.AudioContext || window.webkitAudioContext)();
	var visualizerAudioBuffer	= null;
	var visualizerSamples		= 500;
	var visualizerMaxValue		= 0;	// Used to store the max value of a spot in the array, so we max to that

	var firstLoad		= false;

	var heckleDiv = new Image();
	heckleDiv.draggable = false;
	heckleDiv.className = '';
	heckleDiv.style.animationDelay = '0s';

	var mouseTarget		= null;
	var mouseButton		= null;
	var mouseX			= 0;
	var mouseY			= 0;
	var canvasBoundingRect = CANVAS.getBoundingClientRect();

	// History for undoing
	var keyframesHistory			= [];
	var keyframesHistoryPosition	= 0;

	var keyframeCopied				= null;

	// When holding shift, lock adjustments based on this value
	var lockValuesTransformOrigin	= null;
	var lockValuesMouseOrigin		= null;

	///////////////////
	//// FUNCTIONS ////
	///////////////////

	/*

	- Allow fine-tuning in 10ths of a second
	- So the width of the canvas is based on the sound size
	- We base all our calculations off the current time of the audio clip

	*/

	function freezeToggle(state = null){
		// Paused to play
		if(state === true || BODY.className == 'paused'){
			BODY.className = '';
			if(heckleSound.src) heckleSound.play();
			// module.root.getElementById('control-pause').className = '';
			return;
		}
		
		// Unpaused to pause
		if(state === false || BODY.className !== 'paused'){
			BODY.className = 'paused';
			if(heckleSound.src){
				heckleSound.pause();
				
				// Jump to the current keyframe, so animations are precise
				scrubTo(Math.floor(heckleSound.currentTime * 100) / 100);
			}
			// module.root.getElementById('control-pause').className = 'active';
		}
	}

	var keyframeWidth = 0;
	var savingAnimation = false;

	CTX.font = '50px monospace';

	function saveAnimation(path = currentPath){
		if(savingAnimation) return;
		
		savingAnimation = true;
		
		// Pass the data for the animation we want to save
		var formdata = new FormData();
		formdata.append('data',JSON.stringify({
			path: path
			,keyframes: saveData.keyframes[path]
		}));
		
		fetch(module.path + '/index.php',{
			method:'POST'
			,body:formdata
		})
		.then(response => response.text())
		.then(text => {
			console.log(text);
			savingAnimation = false;
		});
	}

	var frameDrawTime = -1;
	function onAnimationFrame(){
		if(heckleSound.src
			&& frameDrawTime !== heckleSound.currentTime
			&& !isNaN(heckleSound.duration)
		){
			frameDrawTime = heckleSound.currentTime;
			
			// Update scrubber display
			var keyframePositions = null;
			if(saveData.keyframes[currentPath]) keyframePositions = saveData.keyframes[currentPath].match(/[\d\.]+(?=%{)/g);
			if(!keyframePositions) keyframePositions = [];
			
			CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
			//050706
			// Background color
			if(BODY.className === 'paused'){
				CTX.fillStyle = '#75f7b1';
				CTX.fillRect(
					0
					,0
					,CANVAS.width
					,CANVAS.height
				);
			}
			
			// Draw visualizer background
			var visualizerSampleWidth = CANVAS.width / visualizerSamples;
			if(visualizerAudioBuffer){
				for(var i = 0, l = visualizerAudioBuffer.length; i < visualizerSamples; i ++){
					CTX.fillStyle = '#2c582e55';
					var height = (CANVAS.height * (visualizerAudioBuffer[i] / visualizerMaxValue));
					CTX.fillRect(
						i * visualizerSampleWidth
						,CANVAS.height - height
						,visualizerSampleWidth
						,height
					);
				}
			}
			
			// Keyframes
			keyframeWidth = 10 / (heckleSound.duration); // What percentage of 10 seconds?
			CTX.fillStyle = '#6a77d2';
			for(var i = 0, l = keyframePositions.length; i < l; i ++){
				/*var x = CANVAS.width
					* (parseFloat(keyframePositions[i]) / 100)
					* (10 / heckleSound.duration)
				;*/
				CTX.fillRect(
					((keyframePositions[i] * 10) * keyframeWidth) + 1
					,0
					,keyframeWidth - 1
					,CANVAS.height
				);
			}
			
			// Draw all lines for keyframes
			CTX.fillStyle = '#2c582e';
			for(var i = 0; i < 1000; i ++){
				CTX.fillRect(
					i * keyframeWidth
					,0
					,1
					,CANVAS.height
				);
				
				if(i * keyframeWidth > CANVAS.width) break;
			}
			
			//console.log('space to remove',heckleSound.currentTime % keyframeWidth)
			
			// Scrubber line
			CTX.fillStyle = '#2c582eaa';
			CTX.fillRect(
				((heckleSound.currentTime) / heckleSound.duration) * CANVAS.width
				,0
				,keyframeWidth
				,CANVAS.height
			);
			
			/*CTX.fillStyle = '#000000dd';
		
			CTX.fillText(
				decimalRoundDisplay(heckleSound.currentTime,2) + 's/' + decimalRoundDisplay(heckleSound.duration,2) + 's'
				,15
				,50
			);*/
			module.root.getElementById('control-time').innerHTML = decimalRoundDisplay(heckleSound.currentTime,2) + 's/' + decimalRoundDisplay(heckleSound.duration,2) + 's';
			
			// Update display values based on matrix
			var currentTransform = getTransformMatrixAsArray();
			module.root.getElementById('control-transform-translate-x').value	= currentTransform[TRANSLATE_X];
			module.root.getElementById('control-transform-translate-y').value	= currentTransform[TRANSLATE_Y];
			module.root.getElementById('control-transform-scale-x').value		= currentTransform[SCALE_X];
			module.root.getElementById('control-transform-scale-y').value		= currentTransform[SCALE_Y];
			module.root.getElementById('control-transform-skew-x').value		= currentTransform[SKEW_X];
			module.root.getElementById('control-transform-skew-y').value		= currentTransform[SKEW_Y];
			module.root.getElementById('control-transform-opacity').value		= currentTransform[OPACITY];
		}
		
		// Run this again on the next animation frame
		window.requestAnimationFrame(onAnimationFrame);
	}

	function decimalRoundDisplay(number,places){
		var power = Math.pow(10,places);
		
		var value = Math.floor(number * power) / (power);
		var printValue = String(value);
		
		if(!/\./.test(printValue)) printValue += '.00';
		else if(!/\.\d\d/.test(printValue)) printValue += '0';
		
		return printValue;
	}

	function scrubTo(to = heckleSound.currentTime){
		if(!heckleSound.src) return;
		
		//console.log('This is the to time',to);
		heckleSound.currentTime = to;
		//if(BODY.className !== 'paused') heckleSound.play();
		// Play a blip of the audio for tracking
		/*if(to < heckleSound.duration){
			heckleSound.currentTime = to;
			heckleSound.play();
			
			// If we're paused, then just play a blip
			if(BODY.className == 'paused'){
				setTimeout(function(){
					heckleSound.pause();
					heckleSound.currentTime = to;
				},100);
			}
		}*/
		

		// Restart the CSS animation, and start it with a negative delay so we're midway through the animation
		var animationName = heckleDiv.style.animationName;
		
		heckleDiv.className = '';
		heckleDiv.style.animationName = '';
		
		void heckleDiv.offsetWidth;
		
		heckleDiv.style.animationDelay = (-to) + 's';
		heckleDiv.className = currentPath;
		heckleDiv.style.animationName = animationName;
	}

	function updateAnimation(){
		frameDrawTime = -1; // Redraw the canvas
		module.root.getElementById('style-animation').innerHTML = saveData.keyframes[currentPath]; // Update the current animation
	}

	function mouseEvents(event){
		// If moving on the canvas
		if(mouseTarget === CANVAS){
			// Blur other elements if we're working on the canvas now. Otherwise, will break shortcut keys.
			if(document.activeElement !== CANVAS) document.activeElement.blur();
			
			switch(mouseButton){
				// Left button
				case 0:
					// Scrub
					if(!event.ctrlKey){
						var percent = (event.clientX - canvasBoundingRect.left) / canvasBoundingRect.width;
						
						if(percent < 0)			percent = 0;
						else if(percent > 1)	percent = 1;
						
						// Scrub precisely
						// scrubTo(heckleSound.duration * percent);
						
						// On scrubbing, scrub to the keyframe so our values are accurate to the animation. Each keyframe is 1/10 of a second
						scrubTo(Math.floor(heckleSound.duration * percent * 100) / 100);
					// Move keyframes
					} else {
						
					}
					break;
				// Right button: Erase keyframes
				case 2:
					// Get the CSS 1/10 percentage point for the current time; based on 10 seconds
					
					// Look for all keyframes within scrubbed area and remove them
					var keyframeIdStart = (Math.floor(((mouseX - canvasBoundingRect.left)) / keyframeWidth));
					var keyframeIdEnd = (Math.floor(((event.clientX - canvasBoundingRect.left)) / keyframeWidth));

					for(var i = (keyframeIdStart < keyframeIdEnd ? keyframeIdStart : keyframeIdEnd); i <= (keyframeIdStart < keyframeIdEnd ? keyframeIdEnd : keyframeIdStart); i ++){
						// Find the current CSS value
						var findRegex = new RegExp('([\s\n\r}^;])' + (i / 10) + '%{([^}]+)}');
						
						var get = findRegex.exec(saveData.keyframes[currentPath]);
						if(get){
							saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(findRegex,'$1');
							updateAnimation();
						}
					}
					break;
				default:break;
			}
			event.preventDefault();
		}else if(mouseTarget === heckleDiv){
			// Blur other elements if we're working on the canvas now. Otherwise, will break shortcut keys.
			if(document.activeElement !== CANVAS) document.activeElement.blur();
			
			switch(mouseButton){
				// Left Button
				case 0:
					// If the left button has just been clicked, save origin starting position; we can lock to it if we hold shift
					if(event.type === 'mousedown'){
						// We get computed styles so we can animate based on the current position in the frame; this allows for finer adjustment and more natural animating
						lockValuesTransformOrigin = getTransformMatrixAsArray();
						
						// Add + 0 so that it passes by value, not by reference
						lockValuesMouseOrigin = [mouseX + 0,mouseY + 0];
					}
				
					// Move, if alt key isn't held
					if(!event.altKey){
						// If we're not locking any movement axis
						if(!event.shiftKey){
							// Look at target position
							var targetXMovement = (event.clientX - mouseX) * HECKLE_SCALE;
							var targetYMovement = (event.clientY - mouseY) * HECKLE_SCALE;
							
							// Move to relative position
							updateKeyframes(TRANSLATE_X,targetXMovement);
							updateKeyframes(TRANSLATE_Y,targetYMovement);
						}
						// If we're locking movement axis based on initial position
						else {
							// If the different in x movement is greater than the difference in y movement
							if(
								Math.abs(lockValuesMouseOrigin[0] - event.clientX)
								>= Math.abs(lockValuesMouseOrigin[1] - event.clientY)
							){
								var targetXMovement = (event.clientX - lockValuesMouseOrigin[0]) * HECKLE_SCALE;
								
								// Move to absolute position, x only
								updateKeyframes(TRANSLATE_X,lockValuesTransformOrigin[TRANSLATE_X] + targetXMovement,false);
							}
							// If the difference in y movement is greater than the difference in x movement
							else {
								var targetYMovement = (event.clientY - lockValuesMouseOrigin[1]) * HECKLE_SCALE;
								
								// Move to absolute position, y only
								updateKeyframes(TRANSLATE_Y,lockValuesTransformOrigin[TRANSLATE_Y] + targetYMovement,false);
							}
							
						}
					// Skew, if alt key is held
					} else {
						updateKeyframes(SCALE_X,.01 * (event.clientX - mouseX));
						updateKeyframes(SCALE_Y,.01 * (event.clientY - mouseY));
					}
					break;
				// Middle Button
				case 1:
					updateKeyframes(OPACITY,-.01 * (event.clientY - mouseY));
					break;
				// Right Button
				case 2:
					updateKeyframes(SKEW_X,-.001 * (event.clientY - mouseY) * HECKLE_SCALE);
					updateKeyframes(SKEW_Y,-.001 * (event.clientX - mouseX) * HECKLE_SCALE);
					break;
				default:break;
			}
		}
		
		mouseX = event.clientX;
		mouseY = event.clientY;
	}

	function getTransformMatrixAsArray(){
		var heckleComputedStyles = getComputedStyle(heckleDiv);
		var calculatedTransform = heckleComputedStyles.getPropertyValue('transform');
		var values = /matrix\((.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+)\)/.exec(calculatedTransform);
		if(values) values.shift();
		// If we can't find the matrix values, set them ourselves
		else {
			values = [1,0,0,1,0,0];
		}
		
		// Get opacity
		values[OPACITY] = heckleComputedStyles.getPropertyValue('opacity');
		
		// Parse them as floats
		for(var i = 0; i < values.length; i ++) values[i] = parseFloat(values[i]);
		
		// Return them
		return values;
	}

	// Taken from here: https://stackoverflow.com/a/18437802/5006449
	function rotateMatrix(matrix,radians){
		var cos = Math.cos(radians);
		var sin = Math.sin(radians);
		var m11 = matrix[0] * cos + matrix[2] * sin;
		var m12 = matrix[1] * cos + matrix[3] * sin;
		var m21 = -matrix[0] * sin + matrix[2] * cos;
		var m22 = -matrix[1] * sin + matrix[3] * cos;
		matrix[0] = m11;
		matrix[1] = m12;
		matrix[2] = m21;
		matrix[3] = m22;  

		return matrix;	
	}

	function updateKeyframes(setting,value,relative = true){
		// Get the CSS 1/10 percentage point for the current time; based on 10 seconds
		// Order of operations affects the final value; it gets messed up easy since we're trying to work with precise float values. Don't put parentheses in this.
		var percentage =
			Math.floor(
				heckleSound.currentTime / heckleSound.duration * 100	// What percentage of the total time?
				* heckleSound.duration / 10 // What percentage of 10 seconds?
			 * 10) / 10
		;
		
		console.log(heckleSound.currentTime,heckleSound.duration,percentage);

		// Find the current CSS value
		var currentValue = null;
		// findRegex is a regex to find the keyframe and its values
		var findRegex = new RegExp('([\s\n\r}^;])' + percentage + '%{([^}]+)}');
		
		var values = null;
		
		// Search for the current keyframe to see if it can be found
		var get = findRegex.exec(saveData.keyframes[currentPath]);
		// If there is currently a CSS value for it, then remove it
		if(get){
			// The current keyframe's value
			currentValue = get[2];
			
			// Get all of the values from the keyframe, and save them in an array
			values = /matrix\((.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+)\);\s*opacity:(.+);/.exec(currentValue);
			values.shift();
			
			// Remove the keyframe from the string; we'll add it at the end of it, and that will work in CSS (animation times don't have to be in order)
			saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(findRegex,'$1');
		}
		else{
			currentValue = percentage + '%{matrix(1,0,0,1,0,0); opacity:1;}';
			
			// Get all of the values
			values = /matrix\((.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+)\);\s*opacity:(.+);/.exec(currentValue);
			values.shift();
			
			//console.log('starting values',values);

			// We get computed styles so we can animate based on the current position in the frame; this allows for finer adjustment and more natural animating
			var heckleComputedStyles = getComputedStyle(heckleDiv);
			var calculatedTransform = heckleComputedStyles.getPropertyValue('transform');
			var valuesMatrix = /matrix\((.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+)\)/.exec(calculatedTransform);
			if(valuesMatrix) valuesMatrix.shift();
			// If we can't find the matrix values, set them ourselves
			else {
				valuesMatrix = [1,0,0,1,0,0];
			}
			
			// Convert the matrix values to regular transforms
			if(valuesMatrix){
				values[SCALE_X]		= valuesMatrix[SCALE_X];
				values[SCALE_Y]		= valuesMatrix[SCALE_Y];
				values[SKEW_X]		= valuesMatrix[SKEW_X];
				values[SKEW_Y]		= valuesMatrix[SKEW_Y];
				values[TRANSLATE_Y]	= valuesMatrix[TRANSLATE_Y];
				values[TRANSLATE_X]	= valuesMatrix[TRANSLATE_X];
			}
			
			values[OPACITY]		= heckleComputedStyles.getPropertyValue('opacity');

			//console.log('updated values',values);
		}
		
		// Adjust passed settings
		if(relative)	values[setting] = parseFloat(values[setting]) + value;
		else{
			// console.log('UPDATE ABSOLUTE',values[setting],value);
			values[setting] = value;
		}
		
		// Sanity checks
		if(values[OPACITY]		<= 0) values[OPACITY] = 0;
		else if(values[OPACITY]	>= 1) values[OPACITY] = 1;

		// Rotation settings
		if(setting === ROTATION) values = rotateMatrix(values,value);

		var response = percentage + '%{transform:matrix(' + values[0] + ',' + values[1] + ',' + values[2] + ',' + values[3] + ',' + values[4] + ',' + values[5] +'); opacity:' + values[OPACITY] + ';}';
		//var response = percentage + '%{transform:matrix(' + values[SCALE_X] + ',' + values[SKEW_X] + ',' + values[SKEW_Y] + ',' + values[SCALE_Y] + ',' + values[TRANSLATE_X] + ',' + values[TRANSLATE_Y] +') rotate(' + values[ROTATION] + 'deg); opacity:' + values[OPACITY] + ';}';
		
		// Replace the ending of the file, and make sure that the ending bracket moves back to the outside
		saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(/}$/,response + '}');
		
		// Scrub the animation so that it updates
		updateAnimation();
	}

	function updateKeyframesByString(string){
		// Get the percentage of the passed keyframe string
		var percentage = /^[^%]+%/.exec(string)[0];

		// findRegex is a regex to find the keyframe and its values in the current keyframe list
		var findRegex = new RegExp('([\s\n\r}^;])' + percentage + '%{([^}]+)}');
		
		// Search for the current keyframe to see if it can be found
		var get = findRegex.exec(saveData.keyframes[currentPath]);
		// If there is currently a CSS value for it, then remove it
		if(get){
			// Remove the keyframe from the string; we'll add it at the end of it, and that will work in CSS (animation times don't have to be in order)
			saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(findRegex,'$1');
		}
		
		// Replace the ending of the file, and make sure that the ending bracket moves back to the outside
		saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(/}$/,string + '}');
		
		// Scrub the animation so that it updates
		updateAnimation();
	}

	function getFrameValues(){
		// Get the CSS 1/10 percentage point for the current time; based on 10 seconds
		var percentage =
			Math.floor((
				(heckleSound.currentTime / heckleSound.duration * 100)	// What percentage of the total time?
				* (heckleSound.duration / 10) // What percentage of 10 seconds?
			) * 10) / 10
		;
		
		// Find the current CSS value
		var currentValue = null;
		var findRegex = new RegExp('([\s\n\r}^;])' + percentage + '%{([^}]+)}');
		
		var values = null;
		
		var get = findRegex.exec(saveData.keyframes[currentPath]);
		//console.log('FIND REGEX:',findRegex,get);
		if(get){
			currentValue = get[2];
			
			// Get all of the values
			values = /matrix\((.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+)\);\s*opacity:(.+);/.exec(currentValue);
			values.shift();
		}
		else{
			currentValue = percentage + '%{matrix(1,0,0,1,0,0); opacity:1;}';
			
			// Get all of the values
			values = /matrix\((.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+),\s*(.+)\);\s*opacity:(.+);/.exec(currentValue);
			values.shift();
			
			var valuesMatrix	= getTransformMatrixAsArray();
			
			// Convert the matrix values to regular transforms
			values[SCALE_X]		= valuesMatrix[SCALE_X];
			values[SCALE_Y]		= valuesMatrix[SCALE_Y];
			values[SKEW_X]		= valuesMatrix[SKEW_X];
			values[SKEW_Y]		= valuesMatrix[SKEW_Y];
			values[TRANSLATE_Y]	= valuesMatrix[TRANSLATE_Y];
			values[TRANSLATE_X]	= valuesMatrix[TRANSLATE_X];
			values[OPACITY]		= valuesMatrix[OPACITY];
		}
		
		var response = percentage + '%{transform:matrix(' + values[0] + ',' + values[1] + ',' + values[2] + ',' + values[3] + ',' + values[4] + ',' + values[5] +'); opacity:' + values[OPACITY] + ';}';
		
		return response;
	}

	// Update all of the trigger data displayed
	function updateTriggers(){
		var fragment = document.createDocumentFragment();
		
		// Chat
		var headingEl = document.createElement('h2');
		headingEl.innerHTML	= 'Chat Triggers';
		headingEl.id		= 'triggers-chat-heading';
		fragment.appendChild(headingEl);
		
		var chatTriggers	= document.createElement('div');
		chatTriggers.id		= 'triggers-chat';
		for(var i = 0, l = saveData.triggers.chat.length; i < l; i++){
			var div				= document.createElement('p');
			
			div.appendChild(createSpan('Trigger '));

			var selectEl	= document.createElement('select');
			selectEl.name	= 'heckle';
			var heckleNames	= Object.keys(saveData.keyframes);
			for(var heckleNamesI = 0, heckleNamesL = heckleNames.length; heckleNamesI < heckleNamesL; heckleNamesI ++){
				var optionEl		= document.createElement('option');
				optionEl.innerHTML	= heckleNames[heckleNamesI];
				// optionEl.value		= heckleNames[heckleNamesI];
				optionEl.value		= heckleNames[heckleNamesI];
				
				selectEl.appendChild(optionEl);
			}
			selectEl.value	= saveData.triggers.chat[i].heckle;
			selectEl.addEventListener('change',saveTriggers);
			div.appendChild(selectEl);
			
			div.appendChild(createSpan(' on chats with "'));
			
			var containsInput			= document.createElement('input');
			containsInput.placeholder	= 'text/regex';
			containsInput.value			= saveData.triggers.chat[i].contains || '';
			containsInput.name			= 'contains';
			containsInput.addEventListener('change',saveTriggers);
			div.appendChild(containsInput);
			
			div.appendChild(createSpan('" from '));
			
			div.appendChild(createSelectInput(
				'userType'
				,saveData.triggers.chat[i].userType || 'Any'
				,[
					{
						name	: 'anyone'
						,value	: 'Any'
					}
					,{
						name	: 'Subscribers'
						,value	: 'sub'
					}
					,{
						name	: 'VIPs'
						,value	: 'vip'
					}
					,{
						name	: 'Mods'
						,value	: 'mod'
					}
					,{
						name	: 'Broadcasters'
						,value	: 'broadcaster'
					}
				]
			));
			
			div.appendChild(createSpan(' named '));
			
			var fromInput			= document.createElement('input');
			fromInput.placeholder	= 'anything';
			fromInput.value			= saveData.triggers.chat[i].from || '';
			fromInput.name			= 'from';
			fromInput.addEventListener('change',saveTriggers);
			div.appendChild(fromInput);
			
			div.appendChild(createSpan(' with a '));
			
			div.appendChild(createSelectInput(
				'cooldownType'
				,saveData.triggers.chat[i].cooldownType || 'global'
				,[
					{
						name	: 'global'
						,value	: 'global'
					}
					,{
						name	: 'per-user'
						,value	: 'user'
					}
				]
			));
			
			div.appendChild(createSpan(' cooldown of '));
			
			var cooldownInput			= document.createElement('input');
			cooldownInput.placeholder	= '0';
			cooldownInput.value			= saveData.triggers.chat[i].cooldown || '0';
			cooldownInput.name			= 'cooldown';
			cooldownInput.type			= 'number';
			cooldownInput.min			= '0';
			cooldownInput.max			= '9999';
			cooldownInput.addEventListener('change',saveTriggers);
			div.appendChild(cooldownInput);
			
			div.appendChild(createSpan(' seconds'));
			
			// Add the delete button
			div.appendChild(createDeleteButton('chat',i));
			
			chatTriggers.appendChild(div);
		}
		fragment.appendChild(chatTriggers);
		
		/// Button to add another Chat Trigger
		var buttonAdd		= document.createElement('button');
		buttonAdd.innerHTML	= 'Add Chat Trigger';
		buttonAdd.className	= 'triggers-add';
		buttonAdd.addEventListener('click',function(){
			saveData.triggers.chat.push({
				"heckle"		: heckleNames[0],
				"contains"		: "",
				"from"			: "",
				"userType"		: "Any",
				"cooldown"		: "0",
				"cooldownType"	: "global"
			});
			updateTriggers();
		});
		fragment.appendChild(buttonAdd);
		
		// Points
		var headingEl = document.createElement('h2');
		headingEl.innerHTML	= 'Channel Rewards Triggers';
		headingEl.id		= 'triggers-points-heading';
		fragment.appendChild(headingEl);
		
		var pointsTriggers	= document.createElement('div');
		pointsTriggers.id	= 'triggers-points';
		// pointsTriggers.appendChild();
		for(var i = 0, l = saveData.triggers.points.length; i < l; i++){
			var div				= document.createElement('p');
			
			div.appendChild(createSpan('Trigger '));

			var selectEl	= document.createElement('select');
			selectEl.name	= 'heckle';
			var heckleNames	= Object.keys(saveData.keyframes);
			for(var heckleNamesI = 0, heckleNamesL = heckleNames.length; heckleNamesI < heckleNamesL; heckleNamesI ++){
				var optionEl		= document.createElement('option');
				optionEl.innerHTML	= heckleNames[heckleNamesI];
				// optionEl.value		= heckleNames[heckleNamesI];
				optionEl.value		= heckleNames[heckleNamesI];
				
				selectEl.appendChild(optionEl);
			}
			selectEl.value	= saveData.triggers.points[i].heckle;
			selectEl.addEventListener('change',saveTriggers);
			div.appendChild(selectEl);
			
			div.appendChild(createSpan(' on redeeming '));
			
			var titleInput			= document.createElement('input');
			titleInput.placeholder	= '[Channel Reward Title]';
			titleInput.value		= saveData.triggers.points[i].title || '';
			titleInput.name			= 'title';
			titleInput.addEventListener('change',saveTriggers);
			div.appendChild(titleInput);
			
			div.appendChild(createSpan(' with user input of '));
			
			var userInputInput			= document.createElement('input');
			userInputInput.placeholder	= 'nothing/anything';
			userInputInput.value		= saveData.triggers.points[i].user_input || '';
			userInputInput.name			= 'user_input';
			userInputInput.addEventListener('change',saveTriggers);
			div.appendChild(userInputInput);
			
			// Add the delete button
			div.appendChild(createDeleteButton('points',i));
			
			pointsTriggers.appendChild(div);
		}
		fragment.appendChild(pointsTriggers);
		
		/// Button to add another Channel Reward
		var buttonAdd		= document.createElement('button');
		buttonAdd.innerHTML	= 'Add Channel Reward Trigger';
		buttonAdd.className	= 'triggers-add';
		buttonAdd.addEventListener('click',function(){
			saveData.triggers.points.push({
				"heckle": heckleNames[0],
				"title": "",
				"user_input": ""
			});
			updateTriggers();
		});
		fragment.appendChild(buttonAdd);
		
		// Bits
		headingEl			= document.createElement('h2');
		headingEl.id		= 'triggers-bits-heading';
		headingEl.innerHTML	= 'Bit Cheer Triggers';
		fragment.appendChild(headingEl);
		
		var bitsTriggers	= document.createElement('div');
		bitsTriggers.id		= 'triggers-bits';
		// pointsTriggers.appendChild();
		for(var i = 0, l = saveData.triggers.bits.length; i < l; i++){
			var div				= document.createElement('p');
	/*
		"chat_message_includes":null,
	*/

			div.appendChild(createSpan('Trigger '));

			// Display all Heckle names
			var selectEl	= document.createElement('select');
			selectEl.name	= 'heckle';
			var heckleNames	= Object.keys(saveData.keyframes);
			for(var heckleNamesI = 0, heckleNamesL = heckleNames.length; heckleNamesI < heckleNamesL; heckleNamesI ++){
				var optionEl		= document.createElement('option');
				optionEl.innerHTML	= heckleNames[heckleNamesI];
				// optionEl.value		= heckleNames[heckleNamesI];
				optionEl.value		= heckleNames[heckleNamesI];
				
				selectEl.appendChild(optionEl);
			}
			selectEl.value	= saveData.triggers.bits[i].heckle;
			selectEl.addEventListener('change',saveTriggers);
			div.appendChild(selectEl);
			
			div.appendChild(createSpan(' on '));
			
			// Anonymity
			div.appendChild(createSelectInput(
				'is_anonymous'
				,saveData.triggers.bits[i].is_anonymous || 'Any'
				,[
					{
						name	: 'any'
						,value	: 'Any'
					}
					,{
						name	: 'public'
						,value	: 'false'
					}
					,{
						name	: 'anonymous'
						,value	: 'true'
					}
				]
			));
			
			div.appendChild(createSpan(' cheers between '));
			
			// Bits min
			var bitsMinInput		= document.createElement('input');
			bitsMinInput.name		= 'bits_min';
			bitsMinInput.type		= 'number';
			bitsMinInput.min		= 1;
			bitsMinInput.step		= 1;
			bitsMinInput.value		= saveData.triggers.bits[i].bits_min || bitsMinInput.min;
			bitsMinInput.addEventListener('change',saveTriggers);
			div.appendChild(bitsMinInput);
			
			div.appendChild(createSpan(' and '));
			
			var bitsMaxInput		= document.createElement('input');
			bitsMaxInput.name		= 'bits_max';
			bitsMaxInput.type		= 'number';
			bitsMaxInput.min		= 1;
			bitsMaxInput.step		= 1;
			bitsMaxInput.value		= saveData.triggers.bits[i].bits_max || bitsMaxInput.max;
			bitsMaxInput.max		= 9999999999;
			bitsMaxInput.addEventListener('change',saveTriggers);
			div.appendChild(bitsMaxInput);
			
			div.appendChild(createSpan(' bits'));
			
			var chatMessageIncludesInput	= document.createElement('input');
			chatMessageIncludesInput.name	= 'chat_message_includes';
			chatMessageIncludesInput.value	= saveData.triggers.bits[i].chat_message_includes || "";
			chatMessageIncludesInput.addEventListener('change',saveTriggers);
			div.appendChild(chatMessageIncludesInput);
			/// TODO: add chatMessageIncludesInput option support
			chatMessageIncludesInput.style.display = 'none';
			
			// Add the delete button
			div.appendChild(createDeleteButton('bits',i));
			
			bitsTriggers.appendChild(div);
		}
		fragment.appendChild(bitsTriggers);
		
		var buttonAdd		= document.createElement('button');
		buttonAdd.innerHTML	= 'Add Bit Cheer Trigger';
		buttonAdd.className	= 'triggers-add';
		buttonAdd.addEventListener('click',function(){
			saveData.triggers.bits.push({
				"heckle": heckleNames[0],
				"is_anonymous": "Any",
				"chat_message_includes": "",
				"bits_min": "1",
				"bits_max": "9999999999"
			});
			updateTriggers();
		});
		fragment.appendChild(buttonAdd);
		
		headingEl			= document.createElement('h2');
		headingEl.id		= 'triggers-subscriptions-heading';
		headingEl.innerHTML	= 'Subscription Triggers';
		fragment.appendChild(headingEl);
		
		// Subscriptions
		var subscriptionsTriggers	= document.createElement('div');
		subscriptionsTriggers.id	= 'triggers-subscriptions';
		// pointsTriggers.appendChild();
		for(var i = 0, l = saveData.triggers.subscriptions.length; i < l; i++){
			var div				= document.createElement('p');
	/*

	X	"heckle":"goatgoat",
		
	X	"sub_plan":null,
	X	"context":"subgift",
		
	X	"months_min":null,
	X	"months_max":null,

		"message_includes":null
	*/

			div.appendChild(createSpan('Trigger '));

			// Display all Heckle names
			var selectEl	= document.createElement('select');
			selectEl.name	= 'heckle';
			var heckleNames	= Object.keys(saveData.keyframes);
			for(var heckleNamesI = 0, heckleNamesL = heckleNames.length; heckleNamesI < heckleNamesL; heckleNamesI ++){
				var optionEl		= document.createElement('option');
				optionEl.innerHTML	= heckleNames[heckleNamesI];
				// optionEl.value		= heckleNames[heckleNamesI];
				optionEl.value		= heckleNames[heckleNamesI];
				
				selectEl.appendChild(optionEl);
			}
			selectEl.value	= saveData.triggers.subscriptions[i].heckle;
			selectEl.addEventListener('change',saveTriggers);
			div.appendChild(selectEl);
			
			div.appendChild(createSpan(' on '));
			
			// Sub type
			div.appendChild(createSelectInput(
				'context'
				,saveData.triggers.subscriptions[i].context || 'Any'
				,[
					{
						name	: 'any'
						,value	: 'Any'
					}
					// We ignore "re" in the result; that makes life easier, and trackig for "re" doesn't seem necessary
					,{
						name	: 'personal'
						,value	: 'sub'
					}
					,{
						name	: 'publicly gifted'
						,value	: 'subgift'
					}
					,{
						name	: 'anonomously gifted'
						,value	: 'anonsubgift'
					}
				]
			));
			
			// Sub plan values
			div.appendChild(createSelectInput(
				'sub_plan'
				,saveData.triggers.subscriptions[i].sub_plan || 'Any'
				,[
					{
						name	: 'any tier'
						,value	: 'Any'
					}
					,{
						name	: 'Tier 1'
						,value	: '1000'
					}
					,{
						name	: 'Tier 2'
						,value	: '2000'
					}
					,{
						name	: 'Tier 3'
						,value	: '3000'
					}
				]
			));
			
			div.appendChild(createSpan(' subs between months '));
			
			// Months min
			var monthsMinInput		= document.createElement('input');
			monthsMinInput.name		= 'months_min';
			monthsMinInput.type		= 'number';
			monthsMinInput.min		= 1;
			monthsMinInput.max		= 999;
			monthsMinInput.step		= 1;
			monthsMinInput.value	= saveData.triggers.subscriptions[i].months_min || 1;
			monthsMinInput.addEventListener('change',saveTriggers);
			div.appendChild(monthsMinInput);
			
			div.appendChild(createSpan(' and '));
			
			var monthsMaxInput		= document.createElement('input');
			monthsMaxInput.name		= 'months_max';
			monthsMaxInput.type		= 'number';
			monthsMaxInput.min		= 1;
			monthsMaxInput.max		= 999;
			monthsMaxInput.step		= 1;
			monthsMaxInput.value	= saveData.triggers.subscriptions[i].months_max || 999;
			monthsMaxInput.addEventListener('change',saveTriggers);
			div.appendChild(monthsMaxInput);
			
			var messageIncludesInput	= document.createElement('input');
			messageIncludesInput.name	= 'message_includes';
			messageIncludesInput.value	= saveData.triggers.subscriptions[i].message_includes || "";
			messageIncludesInput.addEventListener('change',saveTriggers);
			div.appendChild(messageIncludesInput);
			/// TODO: add messageIncludesText option support
			messageIncludesInput.style.display = 'none';
			
			// Add the delete button
			div.appendChild(createDeleteButton('subscriptions',i));
			
			subscriptionsTriggers.appendChild(div);
		}
		fragment.appendChild(subscriptionsTriggers);

		var buttonAdd		= document.createElement('button');
		buttonAdd.innerHTML	= 'Add Subscription Trigger';
		buttonAdd.className	= 'triggers-add';
		buttonAdd.addEventListener('click',function(){
			saveData.triggers.subscriptions.push({
				"heckle": heckleNames[0],
				"sub_plan": "Any",
				"months_min": "1",
				"months_max": "999",
				"context": "Any",
				"message_includes": ""
			});
			updateTriggers();
		});
		fragment.appendChild(buttonAdd);
		
		var child;
		while(child = module.root.querySelector('footer').firstChild) module.root.querySelector('footer').removeChild(child);
		
		module.root.querySelector('footer').appendChild(fragment);
	}

	function createSelectInput(name,value,potentialValues){
		var fragment	= document.createDocumentFragment();

		// Create the tag with the title
		// var pEl			= document.createElement('p');
		// pEl.innerHTML	= title;
		
		// Create the select item and options
		var selectEl	= document.createElement('select');
		selectEl.name	= name;
		for(var i = 0, l = potentialValues.length; i < l; i ++){
			var optionEl		= document.createElement('option');
			optionEl.innerHTML	= potentialValues[i].name;
			optionEl.value		= potentialValues[i].value;
			
			selectEl.appendChild(optionEl);
		}
		selectEl.value	= value;
		selectEl.addEventListener('change',saveTriggers);

		fragment.appendChild(selectEl);
		
		return fragment;
	}

	// Create a button to delete the trigger on its row
	function createDeleteButton(type,id){
		var buttonEl = document.createElement('button');
		buttonEl.innerHTML = 'X';
		buttonEl.className = 'triggers-delete-button';
		buttonEl.addEventListener('click',function(){
			console.log('running this',type,id);
			saveData.triggers[type].splice(id,1);
			updateTriggers();
			saveTriggers();
		});
		
		return buttonEl;
	}

	function createSpan(text){
		var el = document.createElement('span');
		el.innerHTML = text;
		return el;
	}

	var savingTriggers = false;
	function saveTriggers(){
		// If already saving, don't try saving yet
		if(savingTriggers) return;
		
		savingTriggers = true;
		
		console.log('saving triggers');
		
		// Save chat triggers
		var chatTriggers = module.root.getElementById('triggers-chat').children;
		for(var i = 0, l = chatTriggers.length; i < l; i ++){
			var fields = Object.keys(saveData.triggers.chat[0]);
			// Get all fields and save the relevant fields in
			for(var fieldI = 0, fieldL = fields.length; fieldI < fieldL; fieldI ++){
				saveData.triggers.chat[i][fields[fieldI]] = chatTriggers[i].querySelector('[name="' + fields[fieldI] + '"]').value;
			}
		}
		
		// Save points triggers
		var pointTriggers = module.root.getElementById('triggers-points').children;
		for(var i = 0, l = pointTriggers.length; i < l; i ++){
			var fields = Object.keys(saveData.triggers.points[0]);
			// Get all fields and save the relevant fields in
			for(var fieldI = 0, fieldL = fields.length; fieldI < fieldL; fieldI ++){
				saveData.triggers.points[i][fields[fieldI]] = pointTriggers[i].querySelector('[name="' + fields[fieldI] + '"]').value;
			}
		}
		
		// Save bits triggers
		var bitsTriggers = module.root.getElementById('triggers-bits').children;
		for(var i = 0, l = bitsTriggers.length; i < l; i ++){
			var fields = Object.keys(saveData.triggers.bits[0]);
			// Get all fields and save the relevant fields in
			for(var fieldI = 0, fieldL = fields.length; fieldI < fieldL; fieldI ++){
				saveData.triggers.bits[i][fields[fieldI]] = bitsTriggers[i].querySelector('[name="' + fields[fieldI] + '"]').value;
			}
		}
		
		// Save subscription triggers
		var subscriptionTriggers = module.root.getElementById('triggers-subscriptions').children;
		for(var i = 0, l = subscriptionTriggers.length; i < l; i ++){
			var fields = Object.keys(saveData.triggers.subscriptions[0]);
			// Get all fields and save the relevant fields in
			for(var fieldI = 0, fieldL = fields.length; fieldI < fieldL; fieldI ++){
				saveData.triggers.subscriptions[i][fields[fieldI]] = subscriptionTriggers[i].querySelector('[name="' + fields[fieldI] + '"]').value;
			}
		}
		
		// Pass the data for the animation we want to save
		var formdata = new FormData();
		formdata.append('triggers',JSON.stringify(saveData.triggers, null, '\t'));
		
		fetch(module.path + '/index.php',{
			method:'POST'
			,body:formdata
		})
		.then(response => response.text())
		.then(text => {
			console.log(text);
			savingTriggers = false;
		});
	}

	///////////////////
	//// LISTENERS ////
	///////////////////

	window.addEventListener('resize',function(){
		canvasBoundingRect = CANVAS.getBoundingClientRect();
	});

	// module.root.getElementById('control-pause').addEventListener('click',freezeToggle);

	window.requestAnimationFrame(onAnimationFrame);

	heckleSound.addEventListener('canplaythrough',function(){
		// Ignore if we're paused
		if(BODY.className == 'paused'){
			heckleSound.pause();
			return;
		}
		
		// On first load, autoplay in general
		if(!firstLoad){
			return;
		}

		// module.root.getElementById('control-slider').max = this.duration;

		// Use the save data if it exists, or set up some defaults
		saveData.keyframes[currentPath] = saveData.keyframes[currentPath] || '@keyframes ' + currentPath + '{0%{visibility:visible;transform:matrix(1,0,0,1,0,0);opacity:1;}' + (Math.floor(this.duration * 10 * 10) / 10) + '%{visibility:hidden;transform:matrix(1,0,0,1,0,0);opacity:1;}100%{visibility:hidden;transform:matrix(1,0,0,1,0,0);opacity:1;}}';

		// Replace keyframes name, as it will have been wrong if the person copy-pasted a new Heckle folder
		saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(/@keyframes\s[^{]+/,'@keyframes ' + currentPath);

		updateAnimation();
		
		module.root.getElementById('frame-holder').appendChild(heckleDiv);
		firstLoad = false;
		this.play();
	});

	heckleDiv.addEventListener('load',function(){
		// Make the sound
		firstLoad = true;
		heckleSound.src = module.path + '/index.php?audiopath=' + currentPath;
		
		// Load audio for visualizer; ripped from https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/
		fetch(heckleSound.src)
		.then(response => response.arrayBuffer())
		.then(arrayBuffer => visualizerAudio.decodeAudioData(arrayBuffer))
		.then(audioBuffer => {
			// Reset visualizer values
			visualizerAudioBuffer	= [];
			visualizerMaxValue		= 0;
			
			var rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
			var blockSize = Math.floor(rawData.length / visualizerSamples); // the number of samples in each subdivision
			for (var i = 0; i < visualizerSamples; i++) {
				var sum = 0;
				// find the sum of all the samples in the block
				for (var j = 0; j < blockSize; j++) sum = sum + Math.abs(rawData[(blockSize * i) + j])
					
				// Save the max height for display
				var average = sum / blockSize;
				if(average > visualizerMaxValue) visualizerMaxValue = average;
				
				visualizerAudioBuffer.push(sum / blockSize); // divide the sum by the block size to get the average
			}
			
			// After this, reset the frame draw time so we draw it all in
			frameDrawTime = -1;
		});
	});

	heckleDiv.addEventListener('drag',function(event){
		event.preventDefault();
		return false;
	});

	function arrayIncludes(array,value){
		for(var i = 0, l = array.length; i < l; i ++){
			if(array[i] == value)
				return true;
		}
		
		return false;
	}

	// Change animations
	document.addEventListener('mousewheel',function(event){
		console.log(event);
		if(arrayIncludes(event.path,heckleDiv)){
			// If alt is held
			if(event.altKey){
				updateKeyframes(ROTATION,.001 * event.deltaY * -1);
			// If alt is not held
			} else {
				updateKeyframes(SCALE_X,.001 * event.deltaY);
				updateKeyframes(SCALE_Y,.001 * event.deltaY);
			}
		}
	});

	heckleSound.addEventListener('ended',function(event){
		if(BODY.className !== 'paused'){
			// This glitches out if we don't reload the sound file on restart- it'll start midway through. I think this is related to mp3 compression and glitches reading them.
			//heckleSound.src = '';
			//firstLoad = true;
			heckleSound.src = module.path + '/index.php?audiopath=' + currentPath;
			scrubTo(0);
			//console.log('currentTime:',heckleSound.currentTime);
		}
	});

	window.addEventListener('mousedown',function(event){
		mouseButton = event.button;
		mouseTarget = event.path[0];

		mouseEvents(event);
	});

	window.addEventListener('mouseup',function(event){
		// If the keyframes have been updated, add this new update to the history
		if(currentPath && keyframesHistory[keyframesHistoryPosition] !== saveData.keyframes[currentPath]){
			// console.log('add to the keyframes',keyframesHistory.length, keyframesHistoryPosition,keyframesHistory[keyframesHistoryPosition], saveData.keyframes[currentPath]);
			keyframesHistoryPosition ++;
			// Get rid of any history after this moment
			keyframesHistory = keyframesHistory.slice(0,keyframesHistoryPosition);
			
			// Add the new keyframe to the history here
			keyframesHistory.push(saveData.keyframes[currentPath])
		}
		
		mouseButton = null;
		mouseTarget = null;
	});

	window.addEventListener('mousemove',function(event){
		mouseEvents(event);
	});

	document.addEventListener('contextmenu',function(event){
		event.preventDefault();
		return false;
	});

	// Keyboard shortcuts (on key down; repeatable)
	document.addEventListener('keydown',function(event){
		// console.log(event);
		// Ignore all key presses if Alt is held
		if(event.altKey) return;
		
		// Ignore all keys if we're in an input element
		for(var i = 0, l = event.path.length; i < l; i ++){
			if(
				event.path[i].tagName === 'INPUT'
				|| event.path[i].tagName === 'SELECT'
				|| event.path[i].tagName === 'OPTION'
				|| event.path[i].tagName === 'TEXTAREA'
			) return;
		}
		
		// Modifier based on special keys held; modifies strengths of operations
		var modifier = 1;
		if(event.shiftKey)		modifier = 5;
		else if(event.ctrlKey)	modifier = .1;
		
		switch(event.key){
			case 'Shift':
				// Don't use Shift as a repeated key
				if(event.repeat) return event.preventDefault();
				break;
			// Copy
			case 'c':
				if(event.ctrlKey){
					keyframeCopied = getFrameValues();
				}
				break;
			// Paste
			case 'v':
				if(event.ctrlKey && keyframeCopied !== null){
					// Get the CSS 1/10 percentage point for the current time; based on 10 seconds
					var percentage =
						Math.floor((
							(heckleSound.currentTime / heckleSound.duration * 100)	// What percentage of the total time?
							* (heckleSound.duration / 10) // What percentage of 10 seconds?
						) * 10) / 10
					;
					
					var response = keyframeCopied.replace(/^[^%]+(%)/,percentage + '%');
					
					console.log(response);
					
					updateKeyframesByString(response);
				}
				break;
			// Pause
			case ' ':
				// Ignore repeat keystrokes for pausing
				if(event.repeat) return event.preventDefault();
			
				freezeToggle();
				return event.preventDefault();
				break;
			// Save
			case 's':
				if(event.ctrlKey){
					saveAnimation(currentPath);
					saveTriggers();
					event.preventDefault();
				}
				break;
			case 'z':
				// Redo on ctrl+shift+z
				if(event.ctrlKey && event.shiftKey){
					if(currentPath && keyframesHistoryPosition < keyframesHistory.length - 1){
						keyframesHistoryPosition ++;
						saveData.keyframes[currentPath] = keyframesHistory[keyframesHistoryPosition];
						updateAnimation();
					}
				// Undo on ctrl+z
				} else if(event.ctrlKey){
					if(currentPath && keyframesHistoryPosition > 0){
						keyframesHistoryPosition --;
						saveData.keyframes[currentPath] = keyframesHistory[keyframesHistoryPosition];
						updateAnimation();
					}
				}
				break;
			case 'y':
				// Redo on ctrl+y
				if(event.ctrlKey){
					if(currentPath && keyframesHistoryPosition < keyframesHistory.length - 1){
						keyframesHistoryPosition ++;
						saveData.keyframes[currentPath] = keyframesHistory[keyframesHistoryPosition];
						updateAnimation();
					}
				}
				break;
			// Transform Shortcuts //
			case 'ArrowLeft':
				updateKeyframes(TRANSLATE_X,-50 * modifier,true);
				event.preventDefault();
				break;
			case 'ArrowRight':
				updateKeyframes(TRANSLATE_X,50 * modifier,true);
				event.preventDefault();
				break;
			case 'ArrowUp':
				updateKeyframes(TRANSLATE_Y,-50 * modifier,true);
				event.preventDefault();
				break;
			case 'ArrowDown':
				updateKeyframes(TRANSLATE_Y,50 * modifier,true);
				event.preventDefault();
				break;
			case '-':
			case '_':
				updateKeyframes(SCALE_X,-.1 * modifier,true);
				updateKeyframes(SCALE_Y,-.1 * modifier,true);
				event.preventDefault();
				break;
			case '=':
			case '+':
				updateKeyframes(SCALE_X,.1 * modifier,true);
				updateKeyframes(SCALE_Y,.1 * modifier,true);
				event.preventDefault();
				break;
			case '[':
			case '{':
				updateKeyframes(ROTATION,-.1 * modifier,true);
				event.preventDefault();
				break;
			case ']':
			case '}':
				updateKeyframes(ROTATION,.1 * modifier,true);
				event.preventDefault();
			default:
				break;
		}
	});

	module.root.getElementById('control-play').addEventListener('click',function(){
		freezeToggle();
	});

	module.root.getElementById('control-save').addEventListener('click',function(){
		saveAnimation(currentPath);
	});

	module.root.getElementById('control-transform-translate-x').addEventListener('change',function(){updateKeyframes(TRANSLATE_X,parseFloat(this.value),false);});
	module.root.getElementById('control-transform-translate-y').addEventListener('change',function(){updateKeyframes(TRANSLATE_Y,parseFloat(this.value),false);});
	module.root.getElementById('control-transform-scale-x').addEventListener('change',function(){updateKeyframes(SCALE_X,parseFloat(this.value),false);});
	module.root.getElementById('control-transform-scale-y').addEventListener('change',function(){updateKeyframes(SCALE_Y,parseFloat(this.value),false);});
	module.root.getElementById('control-transform-skew-x').addEventListener('change',function(){updateKeyframes(SKEW_X,parseFloat(this.value),false);});
	module.root.getElementById('control-transform-skew-y').addEventListener('change',function(){updateKeyframes(SKEW_Y,parseFloat(this.value),false);});
	module.root.getElementById('control-transform-opacity').addEventListener('change',function(){updateKeyframes(OPACITY,parseFloat(this.value),false);});

	module.root.getElementById('option-background').addEventListener('change',async function(event){
		module.root.getElementById('frame-background').className = event.target.value;
		module.root.getElementById('frame-background').srcObject = null;
		module.root.getElementById('frame-background').autoplay = true;
		switch(event.target.value){
			case 'clear':
				break;
			case 'screen':
				module.root.getElementById('frame-background').srcObject = await navigator.mediaDevices.getDisplayMedia({video:{cursor:'moving'},audio:false});
				break;
			case 'webcam':
				module.root.getElementById('frame-background').srcObject = await navigator.mediaDevices.getUserMedia({video:{width:1280,height:720},audio:false});
				break;
			case 'image':
				break;
		}
	});

	///////////////////
	//// START APP ////
	///////////////////

	fetch(module.path + '/index.php?load=true')
	.then(response => response.text())
	.then(text => {
		console.log(text);
		saveData = JSON.parse(text);
		
		// Build out the list of items
		var fragment		= document.createDocumentFragment();
		var packageNames	= Object.keys(saveData.keyframes);
		for(let i = 0, l = packageNames.length; i < l; i ++){
			var button						= document.createElement('button');
			button.innerHTML				= packageNames[i];
			button.addEventListener('click',function(){
				// Autosave other animations if we haven't already
				if(currentPath !== null) saveAnimation(currentPath);
				
				currentPath = packageNames[i];
				freezeToggle(true);
				heckleDiv.className = currentPath;
				heckleDiv.style.animationName = currentPath;
				heckleDiv.src = module.path + '/assets/' + currentPath + '/image.png';
				
				// Save the current item's keyframes as the keyframe history
				keyframesHistory			= [saveData.keyframes[currentPath]];
				keyframesHistoryPosition	= 0;
				
				if(module.root.querySelector('.active')) module.root.querySelector('.active').className = '';
				this.className = 'active';
			});
			
			fragment.appendChild(button);
		}
		
		module.root.getElementById('tabs').appendChild(fragment);

		// Load first file
		currentPath = packageNames[0];
		// freezeToggle(true);
		heckleDiv.className = currentPath;
		heckleDiv.style.animationName = currentPath;
		heckleDiv.src = module.path + '/assets/' + currentPath + '/image.png';

		// Save the current item's keyframes as the keyframe history
		keyframesHistory			= [saveData.keyframes[currentPath]];
		keyframesHistoryPosition	= 0;

		module.root.getElementById('tabs').children[0].className = 'active';

		// Use the save data if it exists, or set up some defaults
		saveData.keyframes[currentPath] = saveData.keyframes[currentPath] || '@keyframes ' + currentPath + '{0%{visibility:visible;transform:matrix(1,0,0,1,0,0);opacity:1;}' + (Math.floor(this.duration * 10 * 10) / 10) + '%{visibility:hidden;transform:matrix(1,0,0,1,0,0);opacity:1;}100%{visibility:hidden;transform:matrix(1,0,0,1,0,0);opacity:1;}}';

		// Replace keyframes name, as it will have been wrong if the person copy-pasted a new Heckle folder
		saveData.keyframes[currentPath] = saveData.keyframes[currentPath].replace(/@keyframes\s[^{]+/,'@keyframes ' + currentPath);

		updateAnimation();

		module.root.getElementById('frame-holder').appendChild(heckleDiv);
		firstLoad = true;

		// Set up Triggers display
		updateTriggers();
	});
}();