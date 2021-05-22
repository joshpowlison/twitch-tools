'use strict';

modules.chattractive = new function(){
	const module		= this;
	module.name			= 'chattractive';
	module.root			= modules[module.name];
	module.isAdminPanel	= (module.root.querySelector('#is-admin') !=null);
	
	// Use Root to call elements (with getElementById, querySelector, and querySelectorAll)
	
	module.onRemove = function(){
		// Remove window and document event listeners
		document.removeEventListener('livestreamchatmessage',onChatMessage);
		document.removeEventListener('interconnectmessage',interconnectOnMessage);
	}
	
	// Unique settings
	module.target	= module.root.querySelector('main');
	
	document.addEventListener('livestreamchatmessage',onChatMessage);
	
	function onChatMessage(event){
		console.log('chattractive',event);
		
		var classes = '';
		var animationOffset = 0;
		var textfxConstant = false;
		
		var messageText = event.detail.messageSansEmotes;
		var messageHTML = event.detail.html;
		
		// If an image URL is in the message, and the user has the necessary privileges, an image will display on-screen. Prepare it so we don't consider its display with the rest
		var chatImgEl = null;
		var chatImgSrc = null;
		if(
			// If user has necessary privileges (is a broadcaster, mod, or VIP)
			(
				(event.detail.badges && event.detail.badges.broadcaster)
				|| (event.detail.badges && event.detail.badges.vip)
				|| (event.detail.mod == 1)
			) && (chatImgSrc = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|svg)(?:[\?&]\S+)?|\S+gstatic.com\/images\S+/i.exec(event.detail.message))
		){
			chatImgEl = document.createElement('img');
			chatImgEl.src = chatImgSrc[0];
			chatImgEl.className = 'chat-image';
			messageText = messageText.replace(chatImgSrc[0],'');
			messageHTML = messageHTML.replace(chatImgSrc[0],'');
		};
		
		// Add text message here
		var block = document.createElement('span');
		block.className = 'block';
		block.dataset.user = event.detail.user_id;
		
		var name = document.createElement('span');
		name.className = 'display-name';
		name.innerHTML = event.detail.display_name;
		
		var message = document.createElement('span');
		
		// Add sing class
		if(/~\s*$/.test(messageText)){
			classes += ' sing';
			animationOffset = 0.00014;
		}
		else
		// Add shake class if no lowercase letters are present
		if(/^\s*~/.test(messageText)){
			classes += ' shake';
			animationOffset = 0.00014;
		}
		
		// Add shout class if no lowercase letters are present
		if(!/[a-z]/.test(messageText))
			classes += ' shout';
		
		// Message effects
		textfx({
			content				: messageHTML
			,element			: message
			,classes			: classes
			,animationOffset	: animationOffset
			,constant			: textfxConstant
		});
		
		block.appendChild(name);
		block.appendChild(message);
		
		if(chatImgEl)
			block.appendChild(chatImgEl);
		
		//module.target.innerHTML = '';
		
		module.target.appendChild(block);
	}
	
	function interconnectOnMessage(event){
		if(event.detail.source == module.name && event.detail.adminpanel)
			COMMANDS[event.detail.command]();
	}
	
	document.addEventListener('interconnectmessage',interconnectOnMessage);
	
	/*
	async function chatMessageElement(data,options = {}){
		
		// If the message was highlighted using Channel Points, post here:
		console.log(data,data['msg-id']);
		if(data['msg-id'] && data['msg-id'] == 'highlighted-message'){
			messageEl.style.boxShadow = '0 0 0 0.05em ' + data.color + 'eb'
			messageEl.style.backgroundColor = data.color + '4f'
		}
		
		// If there was a command in there, italicize it
		//if(data.userCommand){
		//	var commandText = data.userCommand[0]
		//		.replace(/&/g, '&amp;')
		//		.replace(/</g, '&lt;')
		//		.replace(/>/g, '&gt;')
		//		.replace(/"/g, '&quot;')
		//		.replace(/'/g, '&#039;')
		//	;
		//	
		//	// Surround the command with em tags, if they exist
		//	messageText = messageText.replace(commandText,'<span class="chat-command">' + commandText + '</span>');
		//	
		//	// console.log('trying to change',messageText);
		//}
		
		// Make the whole thing look like a command if it was /me command
		messageText = messageText.replace(/ACTION(.*)/,'<span class="chat-command">$1</span>');
		
		// If this is a channel points message, display
		if(typeof(data['custom-reward-id']) !== 'undefined'){
			messageHTML += 'REWARD:';
		}
		
		return messageEl;
	}*/
	
	function clearChat(){
		var child;
		while(child = module.target.lastChild)
			module.target.removeChild(child);
	}
	
	const COMMANDS = [
		clearChat
	];
	
	function textfx(settings){
	/*
	settings = {
		parent				: element
		,content			: string
		,defaultWaitTime
		,defaultConstant
		,defaultAnimation
	}
	*/
		var element = settings.element;
		element.className = 'textfx ' + (settings.classes || '');
		
		//settings.parent.appendChild(element);
		
		var charElement = document.createElement('span');
		charElement.className = 'textfx-letter-container';
		
		var input = settings.content;
		
		var fragment = document.createDocumentFragment();
		var currentParent = fragment;
		var totalWait = 0;
		var letters = ''; // Have to save actual letters separately; special tags and such can mess with our calculations
		
		// Values for change; the first value is the default
		var baseWaitTime	= [settings.waitTime || .03];
		var constant		= [settings.constant || false];
		var animation		= [settings.animationOffset || 0];
		//console.log('THIS HAS ANIMATION',animation);
		
		// Remove extra tabs at the end
		input = input.replace(/\t+$/,'');
		
		var l = input.length;
		
		var escaped = 0;
		
		
		// We check beyond the length of the text because that lets us place characters that allow text wrapping in Firefox; if it starts with '+' we skip that character though
		for(let i = ((input[0] === '+') ? 1 : 0); i < l; i++){
			
			// If HTML
			if(input[i] === '<'){
				// Skip over the opening bracket
				i++;
			
				var values='';
				
				// Wait until a closing bracket (or the end of the text)
				// TODO: add support for > inside of quotes; for example, <input value="Go Right >">
				while(input[i]!='>' && i < l){
					values+=input[i];
					i++;
				}
				
				// We're closing the element
				if(values[0]==='/'){
					// Remove animation values if we need to
					if(currentParent.hasAttribute('animationoffset')){
						animation.pop();
					}
					
					// Remove rate values if we need to
					if(currentParent.hasAttribute('rate') || currentParent.hasAttribute('basetime')){
						baseWaitTime.pop();
					}
					
					// Remove constant values if we need to
					if(currentParent.hasAttribute('constant')){
						constant.pop();
					}
					
					// If the parent doesn't have a parent (it's top-level)
					if(currentParent.parentElement == null){
						fragment.appendChild(currentParent);
						currentParent = fragment;
					// If a parent element exists, it's the new parent
					} else {
						currentParent = currentParent.parentElement;
					}
				// We're creating the element
				}else{
					/// TODO: improve this regex: remove field 4, and take into account escaped quotes
					
					// Get the element's tag and attributes
					var regex=/(\S+)=(['"]?)(.+?)\2(?=\s|$)|(\S+)/g;
					// Capture groups: 4 is attribute name if no value is given. 1 is attribute name if a value is given, and 3 is that value.
					// This takes into account whether single or double quotes are used. However, it doesn't account for escaped single or double-quotes yet. // TODO
					
					var tag=null;
					var attributes=[];
					
					var match;
					while((match=regex.exec(values))!==null){
						if(tag) attributes.push(match);
						else tag=match[0];
					}
					
					/// TODO: allow attributes on <br> tags
					
					// If it's a line break
					if(tag === 'br'){
						var lineBreak = document.createElement('span');
						lineBreak.style.whiteSpace='pre-line';
						lineBreak.innerHTML=' <wbr>';
						currentParent.appendChild(lineBreak);
						// wbr fixes missing lines breaks in Firefox
						currentParent.appendChild(document.createElement('br'));
					}
					// Otherwise, we create the element, read through it, and add the attributes
					else {
						var newElement = document.createElement(tag);
						
						for(let ii = 0; ii < attributes.length; ii++){
							let attributeVal	= null;
							let attributeName	= null;
							
							// See if it has an attributed listed for it; if so, get the attribute
							if(attributes[ii][4]){
								newElement.setAttribute(attributes[ii][4],true);
								
								attributeName	= attributes[ii][4];
								attributeVal	= true;
							}
							else{
								newElement.setAttribute(attributes[ii][1],attributes[ii][3]);
								
								attributeName	= attributes[ii][1];
								attributeVal	= attributes[ii][3];
							}
							
							// Set the attribute
							newElement.setAttribute(attributeName,attributeVal);
							
							// Perform special functions for special attributes
							switch(attributeName){
								// Offset the animation in the element
								case 'animationoffset':
									animation.push(parseFloat(attributeVal));
									break;
								// Set the base time of a letter's speed
								case 'basetime':
									// We're adding to a baseWaitTime array, so we can have nested values
									baseWaitTime.push(
										attributeVal === 'default'
										? defaultBaseWaitTime
										: parseFloat(attributeVal)
									);
									break;
								// Set the speed of the text to constant
								case 'constant':
									constant.push(attributeVal === 'false' ? false : true);
									break;
								// Set the rate of the text (a multiplier)
								case 'rate':
									baseWaitTime.push(baseWaitTime[baseWaitTime.length - 1] * attributeVal);
									break;
								default:
									break;
							}
						}
						
						currentParent.appendChild(newElement);
							
						// If it's not a self-closing tag, make it the new parent
						if(!/^(area|br|col|embed|hr|img|input|link|meta|param|wbr)$/i.test(tag)){
							currentParent = newElement;
						}
					}
					/*
							var setConstant = false;
							var setRate = null;
							var setBaseTime = null;
							for(let ii=0;ii<attributes.length;ii++){
								if(attributes[ii][4]) setConstant = true;
								else{
									switch(attributes[ii][1]){
										case 'constant':
											setConstant = (attributes[ii][3]==='false' ? false : true);
											break;
										case 'rate':
											setRate = attributes[ii][3];
											break;
										case 'basetime':
											setBaseTime = attributes[ii][3];
											break;
									}
								}
							}
							
							var setWaitTime = baseWaitTime[baseWaitTime.length - 1];
							
							if(setBaseTime!==null){
								if(setBaseTime==='default') setWaitTime = defaultBaseWaitTime;
								else setWaitTime=parseFloat(setBaseTime);
							}
							
							if(setRate!==null){
								baseWaitTime.push(baseWaitTime[baseWaitTime.length - 1] * setRate);
							}
							
							constant.push(setConstant);
							baseWaitTime.push(setWaitTime);*/
				}
				
				// Pass over the closing bracket, and read the next character
				continue;
			// If letters
			}else{
				// If a recent character was escaped
				if(escaped) escaped--;
				
				// Escape character NOT NEEDED HERE
				/*if(input[i] === '\\' && i + 1 < l){
					i++;
					
					// This way it will last not just for this char, but for a potential upcoming space
					escaped = 2;
				}*/
				
				var waitTime = baseWaitTime[baseWaitTime.length-1];
				
				var thisChar = input[i];
				
				/*
				🎵	57269
				😂	56834
				
				🤷‍♂️	56631
				♂	9794
				
				End of emoji: 65039
				Start of a new long emoji: 129318 (>120000)
				
				> 50000
				up to 65039
				
				*/
				// console.log(input[i],input.codePointAt(i));
				
				// Combine emoji elements together, if they're past a certain number
				if(
					input.codePointAt(i) > 11040
					|| (
						input.codePointAt(i) >= 9792
						&& input.codePointAt(i) <= 9794
					)
				){
					i++;
					thisChar += input[i];
					// console.log('CHAR',thisChar);
					letters += 'M'; // Just use a placeholder "M" for the emoji; it's just used for checking punctuation anyway.
				}
				// Workaround for HTML entities; get everything after & up to ;
				else if(thisChar == '&'){
					i++;
					for(i; i < l; i ++){
						thisChar += input[i];
						if(input[i] === ';') break;
					}
					
					// console.log('looking at entity',thisChar);
					
					letters += 'E'; // Just use a placeholder "E" for the entity; it's just used for checking punctuation anyway.
				} else letters += thisChar;
				
			
				// Handle punctuation- at spaces we check, if constant isn't true (and if the character wasn't escaped)
				if(input[i] === ' ' && !constant[constant.length-1] && !escaped){
					letterLoop:
					for(var testLetter = letters.length - 2; testLetter > 0; testLetter--){
						switch(letters[testLetter]){
							// Check the previous character; these ones don't count
							case '"':
							case "'":
							case '~':
								continue;
								break;
							case '.':
							case '!':
							case '?':
							case ':':
							case ';':
							case '-':
								waitTime *= 25;
								break letterLoop;
							case ',':
								waitTime *= 15;
								break letterLoop;
							default:
								// No punctuation found
								break letterLoop;
						}
					}
				}

				// Make the char based on charElement
				var charContainer = charElement.cloneNode(false);
				var charAppearAnimation = document.createElement('span')		// Display animation character (appear, shout, etc), parent to charPerpetualAnimation
				charAppearAnimation.className = 'textfx-letter';
				var charPositioning = document.createElement('span');		// Hidden char for positioning
				charPositioning.className='textfx-letter-placeholder';
				
				totalWait += waitTime;
				charAppearAnimation.style.animationDelay = totalWait + 's';
				
				// Build the char and add it to the parent (which may be a document fragment)
				charContainer.appendChild(charAppearAnimation);
				charContainer.appendChild(charPositioning);
				currentParent.appendChild(charContainer);
				
				var charPerpetualAnimation = null;
				
				// Perpetual animation character (singing, shaking...), not always needed
				if(!isNaN(animation[animation.length-1])){
					charPerpetualAnimation = document.createElement('span');
					charPerpetualAnimation.className = 'textfx-letter-animation';
					charPerpetualAnimation.style.animationDelay = -(letters.length/parseFloat(animation[animation.length-1])) + 's';
					if(thisChar.length > 1){
						charPerpetualAnimation.innerHTML = thisChar;
					} else {
						charPerpetualAnimation.innerText = thisChar;
					}
					
					charAppearAnimation.appendChild(charPerpetualAnimation);
				}
				
				// Spaces
				if(thisChar === ' '){
					charContainer.style.whiteSpace = 'pre-line';
					charPositioning.innerHTML = ' <wbr>';
				// Regular characters
				}else{
					// If it's an entity, it's longer
					if(thisChar.length > 1){
						charPositioning.innerHTML = thisChar;
						if(!charPerpetualAnimation) charAppearAnimation.innerHTML = thisChar;
					// If it's not an entity, just read it as normal text
					} else {
						charPositioning.innerText = thisChar;
						if(!charPerpetualAnimation) charAppearAnimation.innerText = thisChar;
					}
				}
			}
		}
		
		// Add this element for Firefox's spacing to work
		var endingWhitespace = document.createElement('span');
		endingWhitespace.style.whiteSpace = 'pre-line';
		endingWhitespace.innerHTML= ' <wbr>';
		fragment.appendChild(endingWhitespace);
		
		// Remove old text
		while(element.firstChild) element.removeChild(element.firstChild);
		
		// Also, scroll to the top
		element.scrollTop = 0;
		
		// Add the chars to the textbox
		element.appendChild(fragment);
		
		return false;
	}
	
	// Admin settings
	
	if(!module.isAdminPanel)
		return;
	
	function callClearChat(){
		console.log('why hello');
		SocketInterconnectSendMessage({
			app:module.name,
			adminpanel:true,
			command:COMMANDS.indexOf(clearChat)
		});
	}
	
	module.root.querySelector('#button-clear-chat').addEventListener('click',callClearChat);
}