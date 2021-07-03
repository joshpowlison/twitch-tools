///////////////////
//// CONSTANTS ////
///////////////////

const CHEERMOTES = ['cheer','Cheer','PogChamp','BibleThump','cheerwhal','Corgo','uni','ShowLove','Party','SeemsGood','Pride','Kappa','FrankerZ','HeyGuys','DansGame','EleGiggle','TriHard','Kreygasm','4Head','SwiftRage','NotLikeThis','FailFish','VoHiYo','PJSalt','MrDestructoid','bday','RIPCheer','Shamrock'];

const PACKAGE_IDS = {
	'core': 1,
	'allchat': 2,
	'chattractive': 3,
	'puppetshow': 4,
	'rpstream': 5,
	'viewerimpact': 6,
	'whosinchat': 7,
	'avatars': 8,
	'notebook': 9,
	'frame': 10
};

const JOIN_ATTEMPTS_MAX		= 15;	// Max is 20 per 10 seconds per user (200 for verified bots)
const BOT_MESSAGE_MAX		= 80;	// Max for an admin or operator of a channel is 100 per 30 seconds; safety at 50, to consider other bot messages
const LOOP_DELAY			= 500;	// The loop runs every 500 milliseconds

///////////////////
//// VARIABLES ////
///////////////////

var SOCKET_CHAT			= null;
var SOCKET_PUBSUB		= null;
var SOCKET_INTERCONNECT	= null;
var SETTINGS			= {};
var lastFrameTimestamp	= new Date().getTime();

var delegateFunctions	= [];
var delegateRunning		= false;

var botMessages			= [];
var botMessageTimes		= [];

var channelsConnected	= [];

///////////////////
//// FUNCTIONS ////
///////////////////

// Wait for a certain number of milliseconds (must call with "await")
async function wait(milliseconds){
	return new Promise((resolve,reject) => {
		setTimeout(resolve,milliseconds);
	});
}

function delegateEnd(){
	delegateFunctions.splice(0,1);
	delegateRunning = false;
}

function dWait(delay){
	return function(){
		setTimeout(delegateEnd,delay);
	};
}

function dLoadSettings(){
	return function(){
		// Load in settings
		var requestKeys = new XMLHttpRequest();
		requestKeys.addEventListener('load', function(e){
			SETTINGS = JSON.parse(this.responseText);
			delegateEnd();
		});
		requestKeys.open('GET','../secret.json');
		requestKeys.send();
	}
}

function dTwitchChatConnect(){
	return function(){
		SOCKET_CHAT = new WebSocket('wss://irc-ws.chat.twitch.tv:443/', 'irc');
		
		// Initial connection to the websocket
		SOCKET_CHAT.addEventListener('open',async function(){
			console.log('Twitch Chat connecting and authenticating...');

			SOCKET_CHAT.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
			SOCKET_CHAT.send('PASS ' + SETTINGS.oauthToken);
			SOCKET_CHAT.send('NICK ' + SETTINGS.username);
			
			// Join all chat channels
			for(var i = 0, l = SETTINGS.channels.length; i < l; i ++){
				delegateFunctions.push(dTwitchChatJoinChannel(SETTINGS.channels[i]));
				
				// Every JOIN_ATTEMPTS_MAX connects, wait 11 seconds so we don't risk going over the limit. (The limit is 20 join attempts per 10 seconds per user)
				if(i > 0 && !(i % JOIN_ATTEMPTS_MAX))
					delegateFunctions.push(dWait(11 * 1000));
			}
		});
		
		SOCKET_CHAT.addEventListener('message',onChatMessage);
		
		delegateEnd();
	}
}

function dTwitchPubsubConnect(){
	return function(){
		SOCKET_PUBSUB = new WebSocket('wss://pubsub-edge.twitch.tv');
		
		// Initial connection to the websocket
		SOCKET_PUBSUB.addEventListener('open',function(){
			console.log('Twitch Pubsub connecting and authenticating...');
			
			SOCKET_PUBSUB.send(JSON.stringify({
				type:'LISTEN',
				data:{
					topics:[
						'channel-points-channel-v1.' + SETTINGS.userId
						,'channel-bits-events-v2.' + SETTINGS.userId
						,'channel-subscribe-events-v1.' + SETTINGS.userId
					],
					auth_token:SETTINGS.oauthToken.replace(/^oauth:?/i,'')
				}
			}));
			
			// PING regularly
			setInterval(function(){
				SOCKET_PUBSUB.send(JSON.stringify({type:'PING'}));
			},60 * 1000 * 3);
		});

		SOCKET_PUBSUB.addEventListener('close',function(){console.log('Connection Closed');});
		SOCKET_PUBSUB.addEventListener('error',function(error){console.log('Connection Error: ' + error.toString());});

		// Receiving a message
		SOCKET_PUBSUB.addEventListener('message',onPubSubMessage);
		
		delegateEnd();
	}
}

function dTwitchChatJoinChannel(channel){
	return function(){
		SOCKET_CHAT.send('JOIN #' + channel);
		console.log('listening to ' + channel);
		
		channelsConnected.push(channel);
		document.dispatchEvent(new CustomEvent('livestreamchannelconnect', {detail:{channel:channel}}));
		
		delegateEnd();
	}
}

function dLoadSocketInterconnect(){
	return function(){
		if(SOCKET_INTERCONNECT != null)
			return;
		
		SOCKET_INTERCONNECT = new WebSocket('ws://localhost:9000/chatsocket/server.php');

		SOCKET_INTERCONNECT.onmessage = function(event) {
			SocketInterconnectReceiveMessage(event.data);
		};

		SOCKET_INTERCONNECT.onopen = function(event){console.log(event);}
		SOCKET_INTERCONNECT.onerror = function(event){console.log(event);}
		SOCKET_INTERCONNECT.onclose = function(event){
			console.log(event);
			
			SOCKET_INTERCONNECT = null;
			
			// In 5 seconds, try to reconnect
			setTimeout(function(){
				delegateFunctions.push(dLoadSocketInterconnect());
			}, 5000);
		}
		
		delegateEnd();
	}
}

function SocketInterconnectSendMessage(json){
	// Create the char from the package
	var source = PACKAGE_IDS[json.app];
	if(json.adminpanel)
		source += 128;
	
	var command = json.command;
	if(command < 0)
		command = 127 + Math.abs(command);
	
	if(SOCKET_INTERCONNECT == null){
		console.log('WARNING: No socket connection present. Please wait...');
		return;
	}
	
	SOCKET_INTERCONNECT.send(String.fromCharCode((source << 8) + command));
}

function SocketInterconnectReceiveMessage(message){
	// Loading data from the char
	var data = message.charCodeAt(0);
	
	var source = data >>> 8;
	var admin = false;
	if(source >= 128){
		source -= 128;
		admin = true;
	}
	
	var command = (data << 24) >>> 24;
	if(command >= 128){
		command -= 127;
		command *= -1;
	}
	
	var keys = Object.keys(PACKAGE_IDS);
	var ids = Object.values(PACKAGE_IDS);
	
	// Make into more human-readable json
	var json = {
		source: keys[ids.indexOf(source)],
		adminpanel: admin,
		command: command
	};
	
	document.dispatchEvent(new CustomEvent('interconnectmessage', {detail: json}));
}

function onChatMessage(message){
	var rawMessages = message.data.split(/[\r\n]+/i);
	
	for(var i = 0, l = rawMessages.length; i < l; i ++){
		var rawMessage = rawMessages[i];
		
		// Skip empty messages
		if(/^\s*$/i.test(rawMessage))
			continue;
				
		// Reply to "PING"s with "PONG" so we stay connected
		if(/^PING\s*/i.test(rawMessage)){
			console.log('sending back PONG for Twitch Chat!');
			SOCKET_CHAT.send('PONG :tmi.twitch.tv');
			continue;
		}
		
		var match;
		console.log(rawMessage);
		// :linkk326!linkk326@linkk326
		// Get user names in chat
		if(match = /^:([^!]+)!([^@]+)@([^\.]+)\.tmi\.twitch\.tv JOIN #.+$/.exec(rawMessage)){
			document.dispatchEvent(new CustomEvent('livestreamuserjoin', {detail:{username:match[1]}}));
			continue;
		}
		
		// Chat message
		if(rawMessage[0] === '@'){
			var regex = /[@;]([^=]+)=([^;]*)/g;
			var response;
			var data = {};
			
			while(response = regex.exec(rawMessage)){
				data[response[1]] = response[2];
			}
			
			var messageData = /(PRIVMSG|NOTICE|USERNOTICE)\s(#[^\s]+)\s?:?(.*)/.exec(data['user-type']);
			
			// Ignore messages that aren't of the above type
			if(!messageData) return;
			
			data.type		= messageData[1];
			data.channel	= messageData[2];
			data.message	= messageData[3];
			
			// Only look at PRIVMSGs here- these are user posts in chat
			if(
				data.type !== 'PRIVMSG'
				|| typeof(data['custom-reward-id']) !== 'undefined'
			) return;
			
			// Update user data
			var userData = /\s:([^!]+)!/.exec(data['user-type']);
			data['username'] = userData[1];
			
			// Update badge data
			regex = /([^\/]+)\/([^,]+)/g;
			var badgeText = data['badges'];
			data['badges'] = {};
			while(response = regex.exec(badgeText)){
				data['badges'][response[1]] = response[2];
			}
			
			// Convert dashes to underscores for this
			data['badge_info']		= data['badge-info'];
			data['display_name']	= data['display-name'];
			data['room_id']			= data['room-id'];
			data['tmi_sent_ts']		= data['tmi-sent-ts'];
			data['user_id']			= data['user-id'];
			data['user_type']		= data['user-type'];
			
			data.html = getChatMessageHTML(data);
			data.messageSansEmotes = getChatMessageSansEmotes(data);
			
			document.dispatchEvent(new CustomEvent('livestreamchatmessage', {detail: data}));
		}
	}
}

function onPubSubMessage(message){
	console.log('Pubsub Message',message.data);
	var json = JSON.parse(message.data);
	
	switch(json.type){
		// Server reacted to our PING
		case 'PONG':
			break;
		// Server is asking us to reconnect
		case 'RECONNECT':
			break;
		case 'RESPONSE':
			break;
		case 'MESSAGE':
			var pubSubMessage = JSON.parse(json.data.message);
			//document.dispatchEvent(new CustomEvent('livestreampubsub', {detail: data}));
			
			// Alerts from Pubsub include bits, subscriptions, and points
			// Channel Reward
			if(pubSubMessage.type === 'reward-redeemed')
				document.dispatchEvent(new CustomEvent('livestreamredemption', { detail: pubSubMessage.data }));
	
			// Bits
			/// SAMPLE DATA ///
			/*{
				is_anonymous: false
				,data:{
					user_name: "Name"
					,chat_message: "LUL"
					,bits_used: 10000
				}
				,message_type:"bits_event"
			}
			*/
			if(pubSubMessage.message_type === 'bits_event')
				document.dispatchEvent(new CustomEvent('livestreamcheer', { detail: pubSubMessage }));
	
			// Subscriptions
			/*
			/// SAMPLE DATA ///
			{
				"sub_plan": "1000",
				"months": 9,
				"context": "subgift", // ???, "resub", "subgift", "anonsubgift"
				"sub_message": {
					"message": ""
				}
			}
			*/
			if(typeof(pubSubMessage.sub_plan) !== 'undefined')
				document.dispatchEvent(new CustomEvent('livestreamsubscription', { detail: pubSubMessage }));
			
			break;
		default:
			break;
	}
}

function replaceCheermotes(message){
	var cheermoteData = [];
	
	// Put in cheermotes
	for(var i = 0, l = CHEERMOTES.length; i < l; i ++){
		var regex = (new RegExp('(' + CHEERMOTES[i] + ')(\\d+)(?:\\s|$)','g'))
		
		var response;
		while(response = regex.exec(message)){
			cheermoteData.push([...response]);
		}
		
	}
	
	// Go through the cheermote data and replace values with the correct cheermotes
	for(var i = cheermoteData.length - 1; i >= 0; i --){
		var cheermoteValue = '1';
		var cheermoteColor = '69696a';
		if(cheermoteData[i][2] >= 10000){
			cheermoteValue = '10000';
			cheermoteColor = 'fd413b';
		}
		else if(cheermoteData[i][2] >= 5000){
			cheermoteValue = '5000';
			cheermoteColor = '2c7ee3';
		}
		else if(cheermoteData[i][2] >= 1000){
			cheermoteValue = '1000';
			cheermoteColor = '26d1c3';
		}
		else if(cheermoteData[i][2] >= 100){
			cheermoteValue = '100';
			cheermoteColor = '9954f1';
		}
		
		var cheermoteURL = 'https://d3aqoihi2n8ty8.cloudfront.net/actions/' + cheermoteData[i][1].toLowerCase() + '/dark/animated/' + cheermoteValue + '/4.gif';
		
		// Replace the value in the message with the new one, w00t! If there were 2 or more identical, it should still work fine
		message = message.replace(
			cheermoteData[i][0]
			,'<span class="cheer-amount"><img class="cheermote" src="' + cheermoteURL + '"><span style="color:#' + cheermoteColor + ';font-weight:bold;">' + cheermoteData[i][2] + '</span></span> '
		);
		
		//"https://d3aqoihi2n8ty8.cloudfront.net/actions/' + CHEERMOTES[i] + '/dark/animated/1/4.gif">
	}
	
	return message;
}

// The Loop
function loop() {
	// Delta time, based on seconds
	var frameTimestamp = new Date().getTime();
	var sDeltaTime = (frameTimestamp - lastFrameTimestamp) / 1000;
	lastFrameTimestamp = frameTimestamp;
	
	if(sDeltaTime < 0)
		sDeltaTime = 0;
	
	// Run all delegate functions possible right now
	while(!delegateRunning && delegateFunctions.length){
		delegateRunning = true;
		delegateFunctions[0]();
	}
	
	// If there are messages to try posting, try posting one of them this frame (trying to post too many in a single frame may be a bit rough)
	if(botMessages.length){
		// Remove any messages that happened before
		while(
			botMessageTimes.length
			&& (new Date().getTime() - botMessageTimes[0]) > 30000
		) botMessageTimes.shift();
		
		// Go back if we're over the max number of messages in the last 30 seconds
		if(botMessageTimes.length >= BOT_MESSAGE_MAX) return;
		
		var message = 'PRIVMSG #' + botMessages[0].channelName + ' :' + botMessages[0].message;
		console.log('chat message testing',message);
		
		SOCKET_CHAT.send(message);
		// console.log('PRIVMSG #' + botMessages[0].channelName + ' :' + botMessages[0].message);
		document.getElementById('note').innerHTML = '<strong>' + botMessages[0].message + '</strong> sent in <em>' + botMessages[0].channelName + '</em>';
		// console.log('PRIVMSG ' + SETTINGS.channelName + ' :' + botMessages[0]);
		
		// Remove the message from the array
		botMessages.shift();
		// Push the time that this message was posted
		botMessageTimes.push(new Date().getTime());
	}
	
	document.dispatchEvent(new CustomEvent('livestreamloop', {detail:{sDeltaTime: sDeltaTime}}));
	setTimeout(loop,LOOP_DELAY); // Unfortunately, we have to use this instead of AnimationUpdate because these windows won't always be focused or visible
}

function postChatMessage(message, channelName = SETTINGS.channels[0]){
	botMessages.push({
		message:message
		,channelName:channelName
	});
}

function earlierEmote(a,b){
	return (a[2] > b[2]) ? 1 : -1;
}

function getChatMessageHTML(data,options = {}){
	// Add emote notes in
	var messageHTML		= data.message;
	var emotesData		= data.emotes;
	var emoteList		= [];
	var regex			= /([^,\/:]+):([^\/]+)/g;
	var regexPlaces		= /(\d+)-(\d+)/g;
	var response;
	var responsePlaces;
	
	while(response = regex.exec(emotesData)){
		// We have to go deeper here as well, to sort through the sections as they are split
		while(responsePlaces = regexPlaces.exec(response[2])){
			emoteList.push([
				response[1]
				,parseInt(responsePlaces[1])
				,parseInt(responsePlaces[2])
			]);
		}
	}
	
	emoteList.sort(earlierEmote);
	
	// Replace emotes at positions with images for the emotes
	for(var i = emoteList.length - 1; i >= 0; i --){
		messageHTML = messageHTML.substring(0,parseInt(emoteList[i][1]))
		// Put in a placeholder that we'll just replace later
		+ '[E' + emoteList[i][0] + 'E]'
		+ messageHTML.substring(parseInt(emoteList[i][2]) + 1);
	}
	
	messageHTML = messageHTML
		// Replace concerning terms
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
		// Replace images that are in there
		.replace(/\[E([^,\/:E]+)\E]/g, '<img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v2/$1/default/dark/3.0">')
		//.replace(/\[E([^,\/:E]+)\E]/g, '<span class="chat-emote" style="background:url(\'https://static-cdn.jtvnw.net/emoticons/v1/$1/3.0\');background-size:contain;background-position:center;background-repeat:no-repeat;color:#00000000;">__</span>')
	;
	
	messageHTML = replaceCheermotes(messageHTML);
	
	return messageHTML;
}

function getChatMessageSansEmotes(data,options = {}){
	// Add emote notes in
	var messageHTML		= data.message;
	var emotesData		= data.emotes;
	var emoteList		= [];
	var regex			= /([^,\/:]+):([^\/]+)/g;
	var regexPlaces		= /(\d+)-(\d+)/g;
	var response;
	var responsePlaces;
	
	while(response = regex.exec(emotesData)){
		// We have to go deeper here as well, to sort through the sections as they are split
		while(responsePlaces = regexPlaces.exec(response[2])){
			emoteList.push([
				response[1]
				,parseInt(responsePlaces[1])
				,parseInt(responsePlaces[2])
			]);
		}
	}
	
	// Remove emotes
	for(var i = emoteList.length - 1; i >= 0; i --){
		messageHTML = messageHTML.substring(0,parseInt(emoteList[i][1]))
		+ messageHTML.substring(parseInt(emoteList[i][2]) + 1);
	}
	// Replace cheermotes
	for(var i = 0, l = CHEERMOTES.length; i < l; i ++)
		messageHTML = messageHTML.replace(new RegExp('(' + CHEERMOTES[i] + ')(\\d+)(?:\\s|$)','g'));
	
	messageHTML = replaceCheermotes(messageHTML);
	
	return messageHTML;
}

///////////////////
//// LISTENERS ////
///////////////////

/*

onChatMessage({data:'@badge-info=subscriber/10;badges=broadcaster/1,subscriber/3000;client-nonce=e44388251e3b3052396a274afe17b063;color=#98B4C6;display-name=JoshPowlison;emotes=425618:8-10/25:12-16;flags=;id=3b70c035-8c48-4b31-86b7-a87dc2aa71b7;mod=0;room-id=93957026;subscriber=1;tmi-sent-ts=1616854130826;turbo=0;user-id=93957026;user-type= :joshpowlison!joshpowlison@joshpowlison.tmi.twitch.tv PRIVMSG #joshpowlison :Testing LUL Kappa'});

*/

///////////////////
////// START //////
///////////////////

loop();
delegateFunctions.push(dLoadSettings());
delegateFunctions.push(dLoadSocketInterconnect());
delegateFunctions.push(dTwitchChatConnect());
delegateFunctions.push(dTwitchPubsubConnect());