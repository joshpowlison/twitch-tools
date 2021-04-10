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

function loadPackage(div){
	fetch('../' + div.dataset.package + '/index.php')
	.then(response => response.text())
	.then(text => {
		var shadowDOM = div.attachShadow({mode: 'open'});
		modules[div.dataset.package] = div.shadowRoot;
		
		shadowDOM.innerHTML = text;
		
		var styles = document.createElement('link');
		styles.rel = 'stylesheet';
		styles.href = '../' + div.dataset.package + '/styles.css';
		shadowDOM.appendChild(styles);
		
		var script = document.createElement('script');
		script.src = '../' + div.dataset.package + '/script.js';
		shadowDOM.appendChild(script);
		
		div.onclick = null;
	});
}

// Add username and channels we're watching
document.getElementById('data-account').innerHTML = SETTINGS.username;