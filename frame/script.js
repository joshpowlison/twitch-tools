'use strict';

modules.frame = new function(){
	const module		= this;
	module.name			= 'frame';
	module.root			= modules[module.name];
	module.isAdminPanel	= (module.root.querySelector('#is-admin') != null);
	
	var assetsFolder = module.isAdminPanel ? '../frame/save/' : 'save/';
	
	module.onRemove = function(){
		// Remove window and document event listeners
		//document.removeEventListener('livestreamloop',loop);
		
		if(!module.isAdminPanel)
			return;
		
		//module.root.removeEventListener('keydown',key);
		//document.removeEventListener('keyup',key);
	}
	
	/*
	// Frames
	CONTROL_PANEL.document.getElementById('frame-item').addEventListener('change',async function(){
		
		// On loading a frame
		if(this.value !== 'none'){
			// When the frame image loads, update it to match the new image
			document.getElementById('frame-image').onload = async function(){
				document.body.dataset.frame = this.dataset.frame;
				(await loadSound('audio/frame-in.mp3')).play();
			}
			
			document.getElementById('frame-image').src = 'images/frame-templates/' + this.value + '.png';
		// On unloading a frame
		}else{
			document.body.dataset.frame = 'none';
			(await loadSound('audio/frame-out.mp3')).play();
		}
			
		document.getElementById('frame-image').dataset.frame = this.value;
	});
	
	CONTROL_PANEL.document.getElementById('frame-text-1-input').addEventListener('input',function(){
		document.getElementById('frame-text-1').innerHTML = this.value;
	});
	
	CONTROL_PANEL.document.getElementById('frame-text-2-input').addEventListener('input',function(){
		document.getElementById('frame-text-2').innerHTML = this.value;
	});
	*/
	
	
	const AUDIO_CONTEXT			= new AudioContext();
	
	const COMMANDS = [
		frameToggle
	];
	
	function interconnectOnMessage(event){
		if(event.detail.source == module.name && event.detail.adminpanel)
		{
			if(module.isAdminPanel)
				return;
			
			// Browser source only

			frameToggle(event.detail.command);
		}
	}

	function frameToggle(number){
		if(number == 0){
			module.root.getElementById('frame').classList.remove('show');
			module.root.getElementById('frame-image').src = '';
			playSound('frame-out');
			return;
		}
		
		// When the frame image loads, update it to match the new image
		
		var frames = ['be-respectful', 'fancy-pooh', 'feelsbad', 'is-this-a', 'lakitu', 'lemongrab', 'shut-up-and-take-my-money', 'success-kid', 'surprised-pikachu', 'two-buttons'];
		
		module.root.getElementById('frame-image').src = 'save/assets/' + frames[number] + '.png';
		playSound('frame-in');
	
		module.root.getElementById('frame').classList.add('show');
	}
	
	function playSound(name){
		// Load and play audio
		var request = new XMLHttpRequest();
		request.open('GET', name + '.mp3', true);
		request.responseType = 'arraybuffer';

		// Decode asynchronously
		request.onload = function(){
			AUDIO_CONTEXT.decodeAudioData(request.response, function(buffer) {
				var source = AUDIO_CONTEXT.createBufferSource();
				source.buffer = buffer;
				source.connect(AUDIO_CONTEXT.destination);
				source.start(0);
			}, function(error){console.log(error);});
		}
		request.send();
	}
	
	if(!module.isAdminPanel){
		document.addEventListener('interconnectmessage',interconnectOnMessage);
		return;
	}
	
	var frameId = 0;
	module.root.getElementById('frame-toggle').addEventListener('click',function(event){
		frameId ++;
		
		if(frameId > 5)
			frameId = 0;
		
		console.log("Sending click message");
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:frameId
		});
		
	});
}