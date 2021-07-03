'use strict';

modules.notebook = new function(){
	const module		= this;
	module.name			= 'notebook';
	module.root			= modules[module.name];
	module.isAdminPanel	= (module.root.querySelector('#is-admin') !=null);
	
	module.onRemove = function(){
		// Remove window and document event listeners
		//document.removeEventListener('livestreamloop',loop);
		
		if(!module.isAdminPanel)
			return;
		
		// module.root.removeEventListener('keydown',key);
		// document.removeEventListener('keyup',key);
	}
	
	const AUDIO_CONTEXT			= new AudioContext();
	
	const COMMANDS = [
		notebookToggle,
		notebookClear
	];
	
	function interconnectOnMessage(event){
		if(event.detail.source == module.name && event.detail.adminpanel)
		{
			if(module.isAdminPanel)
				return;
			
			// Browser source only

			// Regular commands
			if(event.detail.command < COMMANDS.length){
				COMMANDS[event.detail.command]();
				return;
			}
			
			// Typing in characters
			var character = String.fromCharCode(event.detail.command);
			console.log(character);
			
			// Play a random notebook sound, as long as this is a character, not a space
			if(/\S/.test(character))
				playSound('write-0' + Math.ceil(Math.random() * 4));
			//	playSound('write-0' + Math.ceil(Math.random() * 4) +'.mp3');
			
			module.root.getElementById('notebook').innerHTML += character;
		}
	}

	function notebookToggle(){
		var visible = module.root.getElementById('notebook').classList.toggle('show');
		
		playSound('notebook-02');
	}
	
	function notebookClear(){
		module.root.getElementById('notebook').innerHTML = '';
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
	
	module.root.getElementById('notebook-show').addEventListener('click',function(event){
		console.log("Sending click message");
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:0
		});
	});
	
	module.root.getElementById('notebook-clear').addEventListener('click',function(event){
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:1
		});
	});
	
	// Notebook
	module.root.getElementById('notebook-text').addEventListener('input',function(event){
		/*
		
		- inputType: can let us know if we're deleting
		
		*/
		
		// TODO: allow deleting chars
		// No char was passed; for now, we ignore
		if(event.data === null)
			return;
		
		
		var charCode = event.data.charCodeAt(0);
		console.log(charCode);
		
		console.log("Sending char message");
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:charCode
		});
	});
	
	/*
	
	// Just read keystrokes as writing in the notebook, as long as they're not function keys
	if(
		event.target === CONTROL_PANEL.document.getElementById('notebook-send')
		&& !/F\d/.test(event.key)
	){
		document.getElementById('notebook').classList.add('show');
		return true;
	}
	
	*/
}