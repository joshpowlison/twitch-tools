'use strict';

modules.whosinchat = new function(){
	const module	= this;
	module.name		= 'whosinchat';
	module.root		= modules[module.name];
	
	// Use Root to call elements (with getElementById, querySelector, and querySelectorAll)

	module.users	= {};
	
	document.addEventListener('livestreamuserjoin',function(event){
		updateUserInList(event.detail.username,false);
	});
	
	document.addEventListener('livestreamchatmessage',function(event){
		updateUserInList(event.detail['username'],true);
	});
	
	function updateUserInList(username,isChatting = false){
		if(typeof(module.users[username]) == 'undefined'){
			var userBlock = document.createElement('p');
			userBlock.className = 'user';
			userBlock.dataset.username = username;
			
			var elUsername = document.createElement('span');
			elUsername.innerHTML = username;
			userBlock.appendChild(elUsername);
			
			/*var userNote = document.createElement('input');
			userNote.value = 'Testing';
			userNote.addEventListener('change',updateNote);
			userBlock.appendChild(userNote);*/
			
			module.root.getElementById('viewers').appendChild(userBlock);
			
			module.users[username] = {
				lastMessageTime	: 0,
				block			: userBlock
			};
		}
		
		// If the user is chatting, update their last message time
		if(isChatting)
			module.users[username].lastMessageTime = Date.now();
	}

	/*async function updateNote(){
		// Pass the data for the animation we want to save
		var formdata = new FormData();
		formdata.append('username',this.parentElement.dataset.username);
		formdata.append('note',this.value);
		
		await fetch('save.php',{
			method:'POST'
			,body:formdata
		})
		.then(response => response.text())
		.then(text => {console.log(text);});
	}*/
	
	document.addEventListener('livestreamloop',function(){
		// Update Who's in Chat
		var timeUntilLurk = module.root.getElementById('input-minutes-to-lurk').value * 1000 * 60;
		var keys = Object.keys(module.users);
		for(var i = 0, l = keys.length; i < l; i ++){
			var colorAdjustment = 1 - ((Date.now() - module.users[keys[i]].lastMessageTime) / timeUntilLurk);
			
			if(colorAdjustment < 0)
				colorAdjustment = 0;
			
			module.users[keys[i]].block.style.backgroundColor = 'rgb(59,' + Math.round(59 + (colorAdjustment * 196)) + ',59)';
		}
	});
}