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
		hide,
		moveLeft,
		moveRight,
		moveUp,
		moveDown,
		changeImagePrev,
		changeImageNext
	];
	
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
	
	function hide(id, active){ // id and active aren't needed here
		document.body.classList.toggle('hidden');
	}
	
	function moveLeft(id,active)
	{
		module.controls[id].left = active ? 1 : 0;
	}
	
	function moveRight(id,active)
	{
		module.controls[id].right = active ? 1 : 0;
	}
	
	function moveUp(id,active)
	{
		module.controls[id].up = active ? 1 : 0;
	}
	
	function moveDown(id,active)
	{
		module.controls[id].down = active ? 1 : 0;
	}
	
	function changeImagePrev(id,active)
	{
		if(active == 1)
			return;
		
		module.controls[id].imageId --;
		if(module.controls[id].imageId < 0)
			module.controls[id].imageId = saveData.puppets[module.controls[id].puppetId].images.length - 1;
		
		setImage(id);
	}
	
	function changeImageNext(id,active)
	{
		if(active == 1)
			return;

		module.controls[id].imageId ++;
		if(module.controls[id].imageId >= saveData.puppets[module.controls[id].puppetId].images.length)
			module.controls[id].imageId = 0;
		
		setImage(id);
	}
	
	function setImage(id){
		module.puppets[id].children[0].src = assetsFolder + 'assets/' + saveData.puppets[module.controls[id].puppetId].folder + '/' + saveData.puppets[module.controls[id].puppetId].images[module.controls[id].imageId];
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
			
			// Update image data
			for(var i = 0, l = module.controls.length; i < l; i ++)
				setImage(i);
			
			console.log('Updated puppets');
		});
		requestPuppets.open('GET', assetsFolder + 'puppets.json');
		requestPuppets.send();
	}

	function updatePuppetSelection(){
		if(saveData == null)
			return;
		
		var fragment = document.createDocumentFragment();
		for(let i = 0, l = saveData.puppets.length; i < l; i ++){
			var puppetData = document.createElement('div');
			puppetData.className = 'puppet-select';
			
			for(let ii = 0, ll = saveData.puppets[i].images.length; ii < ll; ii ++){
				var imageData = document.createElement('img');
				imageData.src = assetsFolder + 'assets/' + saveData.puppets[i].folder + '/' + saveData.puppets[i].images[ii];
				imageData.className = 'puppet-image-select';
				
				/*imageData.addEventListener('click',function(){
					SocketInterconnectSendMessage({
						app:module.name,
						adminpanel:true,
						command:command * (event.type == 'keydown' ? 1 : -1)
					});
				});*/
				
				puppetData.appendChild(imageData);
			}
			
			fragment.appendChild(puppetData);
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
		
		lastFrameTimestamp = frameTimestamp;
		window.requestAnimationFrame(onAnimationFrame);
	}
	
	function interconnectOnMessage(event){
		if(event.detail.source == module.name && event.detail.adminpanel)
		{
			var id = 0;
			var command = event.detail.command;
			var active = true;
			
			// If just released
			if(command < 0){
				active = false;
				command *= -1;
			}
			
			// Check for the second puppet
			if(command >= 64){
				id = 1;
				command -= 64;
			}
			
			if(module.isAdminPanel)
				return;
			
			// Browser source only

			// Run the command
			COMMANDS[command](id, active);
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
		if(event.altKey) return;
		if(event.ctrlKey && event.key != 'Control') return;
		
		// Ignore all repeat keystrokes
		if(event.repeat) return;
		
		console.log(event);
		
		var command = null;
		switch(event.key.toLowerCase()){
			// Hide only triggers on keydown
			case ' ':
				if(event.type == 'keydown')
					return true;
				command = COMMANDS.indexOf(hide);
				break;
			case 'arrowleft':
				command = COMMANDS.indexOf(moveLeft) + 64;
				break;
			case 'arrowright':
				command = COMMANDS.indexOf(moveRight) + 64;
				break;
			case 'arrowup':
				command = COMMANDS.indexOf(moveUp) + 64;
				break;
			case 'arrowdown':
				command = COMMANDS.indexOf(moveDown) + 64;
				break;
			case 'shift':
				command = COMMANDS.indexOf(changeImagePrev);
				
				if(event.code == 'ShiftRight')
					command += 64;
				break;
			case 'control':
				command = COMMANDS.indexOf(changeImageNext);
				
				if(event.code == 'ControlRight')
					command += 64;
				break;
			case 'a':
				command = COMMANDS.indexOf(moveLeft);
				break;
			case 'd':
				command = COMMANDS.indexOf(moveRight);
				break;
			case 'w':
				command = COMMANDS.indexOf(moveUp);
				break;
			case 's':
				command = COMMANDS.indexOf(moveDown);
				break;
			default:
				return true;
				break;
		}
		
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:command * (event.type == 'keydown' ? 1 : -1)
		});
		
		event.preventDefault();
		return false;
	}
	
	module.root.addEventListener('keydown',key);
	document.addEventListener('keyup',key);
}