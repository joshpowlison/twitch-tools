'use strict';

modules.puppetshow = new function(){
	const module		= this;
	module.name			= 'puppetshow';
	module.root			= modules[module.name];
	module.isAdminPanel	= (module.root.querySelector('#is-admin') !=null);
	
	var assetsFolder = module.isAdminPanel ? '../puppetshow/save/' : 'save/';
	
	module.onRemove = function(){
		// Remove window and document event listeners
		//document.removeEventListener('livestreamloop',loop);
		
		if(!module.isAdminPanel)
			return;
		
		module.root.removeEventListener('keydown',key);
		document.removeEventListener('keyup',key);
	}

	const COMMANDS = [
		moveLeft,
		moveRight,
		moveUp,
		moveDown,
		setPuppet,
		setImage,
		effect,
		background
	];
	
	/*
	
	changeImagePrev,
		changeImageNext
	
	- LeftSpeed (value)
	- RightSpeed (value)
	- UpSpeed (value)
	- DownSpeed (value)
	- SetPuppet (id)
	- SetImage (id)
	- Effect (flip, hide, shake, swizzle, swirl, grayscale, particles)
	- Background (id)
	
	*/
	
	var saveData = [];
	
	module.controls = [
		{
			left:0,
			right:0,
			up:0,
			down:0,
			puppetId:0,
			imageId:0
		},
		{
			left:0,
			right:0,
			up:0,
			down:0,
			puppetId:0,
			imageId:0
		}
	];
	
	function effect(id, value){ // id and active aren't needed here
	
		switch(value){
			case 0: document.body.classList.toggle('hidden'); break;
			case 1: module.puppets[id].classList.toggle('effect-flip'); break;
		}
	}
	
	function moveLeft(id,value)
	{
		module.controls[id].left = value ? 1 : 0;
	}
	
	function moveRight(id,value)
	{
		module.controls[id].right = value ? 1 : 0;
	}
	
	function moveUp(id,value)
	{
		module.controls[id].up = value ? 1 : 0;
	}
	
	function moveDown(id,value)
	{
		module.controls[id].down = value ? 1 : 0;
	}
	
	function changeImagePrev(id,value)
	{
		if(value == 1)
			return;
		
		/*module.controls[id].imageId --;
		if(module.controls[id].imageId < 0)
			module.controls[id].imageId = saveData.puppets[module.controls[id].puppetId].images.length - 1;
		*/
		setImage(id);
	}
	
	function changeImageNext(id,value)
	{
		if(value == 1)
			return;

		/*module.controls[id].imageId ++;
		if(module.controls[id].imageId >= saveData.puppets[module.controls[id].puppetId].images.length)
			module.controls[id].imageId = 0;*/
		
		setImage(id);
	}
	
	function setPuppet(id,value){
		// If the puppet hasn't changed, ignore this
		if(module.controls[id].puppetId == value)
			return;
		
		module.controls[id].puppetId = value;
		
		// Get rid of old physics items
		while(module.puppets[id].children.length > 1)
			module.puppets[id].removeChild(module.puppets[id].lastChild);
		
		var physicsData = saveData.puppets[module.controls[id].puppetId].physics;
		for(var i = 0, l = physicsData.length; i < l; i ++){
			var physicsObject = document.createElement('img');
			physicsObject.src = assetsFolder + 'assets/' + saveData.puppets[module.controls[id].puppetId].folder + '/physics/' + physicsData[i].name;
			physicsObject.className = 'physics';
			
			physicsObject.style.transformOrigin = physicsData[i]['transform-origin'];
			physicsObject.style.transform = 'translate(' + physicsData[i]['image-origin'] + ')';
			
			physicsObject.dataset.angle = module.puppets[id].dataset.angle || 0;
			
			module.puppets[id].appendChild(physicsObject);
		}
	}
	
	function background(id,value){
		
	}
	
	function setImage(id,value){
		module.puppets[id].children[0].src = assetsFolder + 'assets/' + saveData.puppets[module.controls[id].puppetId].folder + '/' + saveData.puppets[module.controls[id].puppetId].images[value];
	}

	module.puppets = document.querySelectorAll('.puppet');

	function loadPuppets(){
		// Load triggers after loading the required keys
		var requestPuppets = new XMLHttpRequest();
		requestPuppets.addEventListener('load', function(e){
			var newPuppets = JSON.parse(this.responseText);

			if(saveData != null && newPuppets.lastUpdated == saveData.lastUpdated)
				return;
			
			saveData = newPuppets;
			
			if(module.isAdminPanel)
				updatePuppetSelection();
			else
			{
				// Update image data
				for(var i = 0, l = module.controls.length; i < l; i ++)
					setImage(i,0);
			}
			
			console.log('Updated puppets');
		});
		requestPuppets.open('GET', assetsFolder + 'puppets.json');
		requestPuppets.send();
	}

	function updatePuppetSelection(){
		if(saveData == null)
			return;
		
		var fragment = document.createDocumentFragment();
		for(let instanceId = 0, instanceLength = 2; instanceId < instanceLength; instanceId ++){
			var instanceData = document.createElement('div');
			instanceData.className = 'instance-select';
			for(let puppetId = 0, puppetLength = saveData.puppets.length; puppetId < puppetLength; puppetId ++){
				var puppetData = document.createElement('div');
				puppetData.className = 'puppet-select';
				
				for(let imageId = 0, imageLength = saveData.puppets[puppetId].images.length; imageId < imageLength; imageId ++){
					var imageData = document.createElement('img');
					imageData.src = assetsFolder + 'assets/' + saveData.puppets[puppetId].folder + '/' + saveData.puppets[puppetId].images[imageId];
					imageData.className = 'puppet-image-select';
					
					// Set the image of the puppet to the image we just clicked
					imageData.addEventListener('click',function(){
						console.log(instanceId,COMMANDS.indexOf(setImage),imageId);
						
						sendMessage(instanceId,COMMANDS.indexOf(setPuppet),puppetId);
						sendMessage(instanceId,COMMANDS.indexOf(setImage),imageId);
					});
					
					puppetData.appendChild(imageData);
				}
				
				instanceData.appendChild(puppetData);
			}
			fragment.appendChild(instanceData);
		}
		
		module.root.querySelector('#puppet-info').appendChild(fragment);
	}

	function rotatePuppet(id, adjustment){
		var regex = /rotate\(([\e\-\d\.]+)deg\)/i;
		var rotation = regex.exec(module.puppets[id].style.transform);
			
		// Rotate a bit
		var degrees = adjustment + parseFloat(rotation[1]);
		
		while(degrees < 0)
			degrees += 360;
		
		if(degrees > 360);
			degrees %= 360;
		
		module.puppets[id].dataset.angle = degrees;
		module.puppets[id].style.transform = module.puppets[id].style.transform.replace(regex, 'rotate(' + degrees + 'deg)');
	}
	
	function liftPuppet(id, adjustment){
		var regex = /translate\(0em,\s*([\e\-\d\.]+)em\)/i;
		var lift = regex.exec(module.puppets[id].style.transform);
		
		// Rotate a bit
		var movement = adjustment + parseFloat(lift[1]);
		
		module.puppets[id].style.transform = module.puppets[id].style.transform.replace(regex,'translate(0em,' + movement + 'em)');
	}

	var lastFrameTimestamp	= 0;
	function onAnimationFrame(frameTimestamp){
		var sDeltaTime = (frameTimestamp - lastFrameTimestamp) / 1000;
		
		for(var i = 0, l = module.controls.length; i < l; i ++){
			if(module.controls[i].left == 1)
				rotatePuppet(i, -200 * sDeltaTime);
			
			if(module.controls[i].right == 1)
				rotatePuppet(i, 200 * sDeltaTime);
			
			if(module.controls[i].up == 1)
				liftPuppet(i, -100 * sDeltaTime);
			
			if(module.controls[i].down == 1)
				liftPuppet(i, 100 * sDeltaTime);
		}
		
		// Look through all physics objects and rotate them based on gravity
		for(var puppetId = 0, puppetCount = module.puppets.length; puppetId < puppetCount; puppetId++){
			var physicsObjects = module.puppets[puppetId].children;
			
			for(var physicsObjectId = 1, physicsObjectCount = physicsObjects.length; physicsObjectId < physicsObjectCount; physicsObjectId ++){
				// The angle we're trying to get to- facing down
				var downwardAngle = -module.puppets[puppetId].dataset.angle;
				
				// The angle we're currently at
				var physicsAngle = physicsObjects[physicsObjectId].dataset.angle;
				
				// Target angle is always down; so our momentum
				//var momentum = (downwardAngle + 90) % 180
				
				//var speed = 5;
				
				//if(physicsAngle > downwardAngle)
				//	physicsAngle -= speed;
				//
				//if(physicsAngle < downwardAngle)
				//	physicsAngle += speed;
				//
				//if(Math.abs(physicsAngle - downwardAngle) < 5)
				//	physicsAngle = downwardAngle;
				
				//if(puppetAngle > physicsAngle)
				//	physicsAngle -= 5;
				//
				//if(puppetAngle < physicsAngle)
				//	physicsAngle += 5;
				
				physicsObjects[physicsObjectId].dataset.angle = downwardAngle;
				physicsObjects[physicsObjectId].style.transform = 'rotate(' + (downwardAngle) + 'deg)';
			}
		}
		
		lastFrameTimestamp = frameTimestamp;
		window.requestAnimationFrame(onAnimationFrame);
	}
	
	/*
	
	New function setup:
	
	Need 1 bit to determine which puppet it is
	
	PUPPET: 1 bit (2 values)
	FUNCTION: 3 bits (8 values)
	PARAMETER: 4 bits (16 values)

	3 bits, 8 commands
	16 values, 4 bits

	- LeftSpeed (value)
	- RightSpeed (value)
	- UpSpeed (value)
	- DownSpeed (value)
	- SetPuppet (id)
	- SetImage (id)
	- Effect (flip, hide, shake, swizzle, swirl, grayscale, particles)
	- Background (id)
	
	*/
	
	function interconnectOnMessage(event){
		if(event.detail.source == module.name && event.detail.adminpanel)
		{
			var number = event.detail.command + 128;
			
			var id = number >>> 7;
			var command = number << 25 >>> 29;
			var value = number << 28 >>> 28;
			
			if(module.isAdminPanel)
				return;
			
			// Browser source only

			// Run the command
			COMMANDS[command](id, value);
		}
	}
	
	document.addEventListener('interconnectmessage',interconnectOnMessage);
	
	loadPuppets();
	
	if(!module.isAdminPanel){
		for(var i = 0, l = module.puppets.length; i < l; i ++){
			module.puppets[i].style.transform = 'rotate(0deg) translate(0em, 0em)';
		}
		
		window.requestAnimationFrame(onAnimationFrame);
		
		// Get the puppets every 10 seconds, in case the file has been changed
		setInterval(loadPuppets,10000);
		return;
	}
	
	// Admin settings
	
	function key(event){
		// Ignore all key presses if Alt is held
		if(event.altKey && event.key != 'Alt') return;
		if(event.ctrlKey && event.key != 'Control') return;
		
		// Ignore all repeat keystrokes
		if(event.repeat) return;
		
		console.log(event);
		
		var id = 0;
		var command = 0;
		var value = 0;
		
		var keydown = event.type == 'keydown';
		
		switch(event.key.toLowerCase()){
			// Hide only triggers on keydown
			case ' ':
				if(!keydown)
					return true;
				command = COMMANDS.indexOf(effect);
				value = 0;
				break;
			case 'arrowleft':
				command = COMMANDS.indexOf(moveLeft);
				id = 1;
				value = keydown ? 1 : 0;
				break;
			case 'arrowright':
				command = COMMANDS.indexOf(moveRight);
				id = 1;
				value = keydown ? 1 : 0;
				break;
			case 'arrowup':
				command = COMMANDS.indexOf(moveUp);
				id = 1;
				value = keydown ? 1 : 0;
				break;
			case 'arrowdown':
				command = COMMANDS.indexOf(moveDown);
				id = 1;
				value = keydown ? 1 : 0;
				break;
			/*case 'shift':
				command = COMMANDS.indexOf(changeImagePrev);
				
				if(event.code == 'ShiftRight')
					id = 1;
				
				value = keydown ? 1 : 0;
				break;
			case 'control':
				command = COMMANDS.indexOf(changeImageNext);
				
				if(event.code == 'ControlRight')
					id = 1;
				
				value = keydown ? 1 : 0;
				break;*/
			case 'alt':
				if(!keydown)
					return true;
			
				command = COMMANDS.indexOf(effect);
				
				if(event.code == 'AltRight')
					id = 1;
				
				value = 1;
				break;
			case 'a':
				command = COMMANDS.indexOf(moveLeft);
				value = keydown ? 1 : 0;
				break;
			case 'd':
				command = COMMANDS.indexOf(moveRight);
				value = keydown ? 1 : 0;
				break;
			case 'w':
				command = COMMANDS.indexOf(moveUp);
				value = keydown ? 1 : 0;
				break;
			case 's':
				command = COMMANDS.indexOf(moveDown);
				value = keydown ? 1 : 0;
				break;
			default:
				return true;
				break;
		}
		
		sendMessage(id, command, value);
		
		event.preventDefault();
		return false;
	}
	
	// Translates data to the command message
	function sendMessage(id, command, value)
	{
		// Bit-shift values so they work
		id = id << 7;
		command = command << 4;
		value = value;
		
		var number = id + command + value - 128;
		
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:number
		});
	}
	
	module.root.addEventListener('keydown',key);
	document.addEventListener('keyup',key);
}