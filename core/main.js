///////////////////
//// CONSTANTS ////
///////////////////

const CHEERMOTES = ['cheer','Cheer','PogChamp','BibleThump','cheerwhal','Corgo','uni','ShowLove','Party','SeemsGood','Pride','Kappa','FrankerZ','HeyGuys','DansGame','EleGiggle','TriHard','Kreygasm','4Head','SwiftRage','NotLikeThis','FailFish','VoHiYo','PJSalt','MrDestructoid','bday','RIPCheer','Shamrock'];

const JOIN_ATTEMPTS_MAX		= 15;	// Max is 20 per 10 seconds per user (200 for verified bots)
const BOT_MESSAGE_MAX		= 80;	// Max for an admin or operator of a channel is 100 per 30 seconds; safety at 50, to consider other bot messages
const LOOP_DELAY			= 500;	// The loop runs every 500 milliseconds

///////////////////
//// VARIABLES ////
///////////////////

var SOCKET_CHAT			= null;
var SETTINGS			= {};
var lastFrameTimestamp	= new Date().getTime();

var delegateFunctions	= [];
var delegateRunning		= false;

var botMessages		= [];
var botMessageTimes	= [];

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

function dTwitchChatConnectAll(){
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
				delegateFunctions.push(dTwitchChatConnect(SETTINGS.channels[i]));
				
				// Every JOIN_ATTEMPTS_MAX connects, wait 11 seconds so we don't risk going over the limit. (The limit is 20 join attempts per 10 seconds per user)
				if(i > 0 && !(i % JOIN_ATTEMPTS_MAX))
					delegateFunctions.push(dWait(11 * 1000));
			}
		});
		
		SOCKET_CHAT.addEventListener('message',onChatMessage);
		
		delegateEnd();
	}
}

function dTwitchChatConnect(channel){
	return function(){
		SOCKET_CHAT.send('JOIN #' + channel);
		console.log('listening to ' + channel);
		// document.getElementById('channels-watching').innerHTML += '<br>' + channel;
		delegateEnd();
	}
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
			
			document.dispatchEvent(new CustomEvent('livestreamchatmessage', {detail: data}));
		}
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
		
		SOCKET_CHAT.send('PRIVMSG #' + botMessages[0].channelName + ' :' + botMessages[0].message);
		// console.log('PRIVMSG #' + botMessages[0].channelName + ' :' + botMessages[0].message);
		document.getElementById('note').innerHTML = '<strong>' + botMessages[0].message + '</strong> sent in <em>' + botMessages[0].channelName + '</em>';
		// console.log('PRIVMSG ' + SETTINGS.channelName + ' :' + botMessages[0]);
		
		// Remove the message from the array
		botMessages.shift();
		// Push the time that this message was posted
		botMessageTimes.push(new Date().getTime());
	}
	
	document.dispatchEvent(new CustomEvent('livestreamloop', {detail:{sDeltaTime: sDeltaTime}}));
	setTimeout(loop,LOOP_DELAY);
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

/*

"Testing <img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v1/425618/3.0"> <img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v1/25/3.0">"

*/

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
		.replace(/\[E([^,\/:E]+)\E]/g, '<img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v1/$1/3.0">')
		//.replace(/\[E([^,\/:E]+)\E]/g, '<span class="chat-emote" style="background:url(\'https://static-cdn.jtvnw.net/emoticons/v1/$1/3.0\');background-size:contain;background-position:center;background-repeat:no-repeat;color:#00000000;">__</span>')
	;
	
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
delegateFunctions.push(dTwitchChatConnectAll());