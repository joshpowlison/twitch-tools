'use strict';

modules.puppetshow = new function(){
	const module		= this;
	module.name			= 'puppetshow';
	module.root			= modules[module.name];
	module.isAdminPanel	= (module.root.querySelector('#is-admin') !=null);
	
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
		moveDown
	];
	
	module.controls = [
		{
			left:0,
			right:0,
			up:0,
			down:0
		},
		{
			left:0,
			right:0,
			up:0,
			down:0
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

	module.puppets = document.querySelectorAll('.puppet');

	function rotatePuppet(id, adjustment){
		var regex = /rotate\(([\-\d\.]+)deg\)/i;
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
		var regex = /translate\(0em,\s*([\-\d\.]+)em\)/i;
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
	
	if(!module.isAdminPanel){
		for(var i = 0, l = module.puppets.length; i < l; i ++){
			module.puppets[i].style.transform = 'rotate(0deg) translate(0em, 0em)';
		}
		
		window.requestAnimationFrame(onAnimationFrame);
		return;
	}
	
	// Admin settings
	
	function key(event){
		// Ignore all key presses if Alt is held
		if(event.altKey) return;
		if(event.ctrlKey) return;
		
		// Ignore all repeat keystrokes
		if(event.repeat) return;
		
		var command = null;
		switch(event.key){
			// Hide only triggers on keydown
			case ' ':
				if(event.type == 'keydown')
					return true;
				command = COMMANDS.indexOf(hide);
				break;
			case 'ArrowLeft':
				command = COMMANDS.indexOf(moveLeft) + 64;
				break;
			case 'ArrowRight':
				command = COMMANDS.indexOf(moveRight) + 64;
				break;
			case 'ArrowUp':
				command = COMMANDS.indexOf(moveUp) + 64;
				break;
			case 'ArrowDown':
				command = COMMANDS.indexOf(moveDown) + 64;
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