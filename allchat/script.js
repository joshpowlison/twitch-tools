'use strict';

modules.allchat = new function(){
	const module = this;
	module.name = 'allchat';
	module.root = modules[module.name];
	
	// Use Root to call elements (with getElementById, querySelector, and querySelectorAll)
	
	module.root.getElementById('message-form').addEventListener('submit',function(event){
		event.preventDefault();
		
		var message = module.root.getElementById('message').value;
		
		// Post the message in all connected channels
		for(var i = 0, l = SETTINGS.channels.length; i < l; i ++)
			postChatMessage(message,SETTINGS.channels[i]);
		
		module.root.getElementById('message').value = '';
	});
}