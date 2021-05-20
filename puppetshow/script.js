'use strict';

/* IDEAS:

- Use left and right analog sticks on controllers to move puppets up and down, as well as rotating them (perhaps also allow moving)
- Use left and right triggers to swap characters, or perhaps images (to make them angry, happy, etc)
- Add the ability to have floppy appendages (like arms, hair, etc)
- Add the ability to have multiple puppets to swap out
- When move up or down, move the puppets' transform origins- it'd look a little more dynamic when they move up (like they're excited or emotional), and less so when they go down (like they're hiding or afraid)

*/

modules.puppetshow = new function(){
	const module	= this;
	module.name		= 'puppetshow';
	module.root		= modules[module.name];
	module.path		= '../' + module.name;
	
	module.onRemove = function(){
		// Remove window and document event listeners
		document.addEventListener('livestreamloop',loop);
	}

	module.controls = [
		{
			puppetIndex:0,
			input:'a',
			state:0,
			transform:'rotate',
			amount:-100
		},
		{
			puppetIndex:0,
			input:'d',
			state:0,
			transform:'rotate',
			amount:100
		},
		{
			puppetIndex:1,
			input:'ArrowLeft',
			state:0,
			transform:'rotate',
			amount:-100
		},
		{
			puppetIndex:1,
			input:'ArrowRight',
			state:0,
			transform:'rotate',
			amount:100
		}
	];

	module.puppets = document.querySelectorAll('.puppet');

	var lastFrameTimestamp	= 0;
	function onAnimationFrame(frameTimestamp){
		var sDeltaTime = (frameTimestamp - lastFrameTimestamp) / 1000;
		
		for(var i = 0, l = module.controls.length; i < l; i ++)
		{
			if(module.controls[i].state == 0)
				continue;
			
			var rotation = /rotate\(([\d\.]+)deg\)/.exec(module.puppets[module.controls[i].puppetIndex].style.transform);
			
			// Rotate a bit
			var degrees = module.controls[i].amount * sDeltaTime;
			if(rotation != null)
				degrees += parseFloat(rotation[1]);
			
			while(degrees < 0)
				degrees += 360;
			
			if(degrees > 360);
				degrees %= 360;
			
			var transform = 'rotate(' + (degrees + module.controls[i].amount * sDeltaTime) + 'deg)';
			module.puppets[module.controls[i].puppetIndex].style.transform = transform;
			
			// module.puppets[module.controls[i].puppetIndex].style.transform.replace(rotation[0], 'rotate(' + (degrees + ) + 'deg)');
		}
		
		lastFrameTimestamp = frameTimestamp;
		window.requestAnimationFrame(onAnimationFrame);
	}

	function key(event){
		// Ignore all key presses if Alt is held
		if(event.altKey) return;
		if(event.ctrlKey) return;
		
		// Ignore all repeat keystrokes
		if(event.repeat) return;
		
		for(var i = 0, l = module.controls.length; i < l; i ++){
			if(event.key != module.controls[i].input)
				continue;
			
			module.controls[i].state = (event.type == 'keydown' ? 1 : 0);
			event.preventDefault();
		}
	}

	// Keyboard shortcuts (on key down; repeatable)
	module.root.addEventListener('keydown',key);
	module.root.addEventListener('keyup',key);
	
	window.requestAnimationFrame(onAnimationFrame);
}