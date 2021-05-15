'use strict';

///////////////////
//// CONSTANTS ////
///////////////////

// 
// document.dispatchEvent(new CustomEvent('livestreamredemption', detail:{}));
// document.dispatchEvent(new CustomEvent('livestreamcheer', detail:{}));
// document.dispatchEvent(new CustomEvent('livestreamraid', detail:{}));
// document.dispatchEvent(new CustomEvent('livestreamsubscription', detail:{}));
// document.dispatchEvent(new CustomEvent('livestreamhost', detail:{}));
// 

///////////////////
//// VARIABLES ////
///////////////////

///////////////////
//// FUNCTIONS ////
///////////////////

var modules = {};

const MAIN = document.getElementsByTagName('MAIN')[0];
const HEADER = document.getElementsByTagName('HEADER')[0];

function togglePackage(packageName){
	var packageDiv = MAIN.querySelector('.package[data-package="' + packageName + '"]');
	console.log(packageDiv);
	
	if(packageDiv != null){
		packageDiv.remove();
		
		if(modules[packageName].onRemove != null)
			modules[packageName].onRemove();
		
		delete modules[packageName];
		
		HEADER.querySelector('.button-package[data-package="' + packageName + '"]').classList.remove('active');
		return;
	}
	
	fetch('../' + packageName + '/index.php')
	.then(response => response.text())
	.then(text => {
		var div = document.createElement('div');
		div.className = 'package';
		div.dataset.package = packageName;
		
		var shadowDOM = div.attachShadow({mode: 'open'});
		modules[packageName] = div.shadowRoot;
		
		shadowDOM.innerHTML = text;
		
		var styles = document.createElement('link');
		styles.rel = 'stylesheet';
		styles.href = '../' + packageName + '/styles.css';
		shadowDOM.appendChild(styles);
		
		var script = document.createElement('script');
		script.src = '../' + packageName + '/script.js';
		shadowDOM.appendChild(script);
		
		MAIN.appendChild(div);
		
		HEADER.querySelector('.button-package[data-package="' + packageName + '"]').classList.add('active');
	});
}


function start(){
	var buttons = document.getElementsByClassName('button-package');
	for(let i = 0, l = buttons.length; i < l; i ++){
		buttons[i].addEventListener('click',function(){
			togglePackage(buttons[i].dataset.package);
		});
	}
}

// Add username and channels we're watching
document.addEventListener('livestreamchannelconnect',function(){
	document.getElementById('data-account').innerHTML = '<strong>Functioning as</strong><br>' + SETTINGS.username;
	
	var channelsConnectedString = '<strong>Connected to channels</strong>';
	for(var i = 0, l = channelsConnected.length; i < l; i ++){
		channelsConnectedString += '<br>' + channelsConnected[i];
	}
	
	if(channelsConnected.length < SETTINGS.channels.length)
	{
		channelsConnectedString += '<br><strong>Connecting...</strong>'
	}
	
	document.getElementById('channels-watching').innerHTML = channelsConnectedString;
});

start();