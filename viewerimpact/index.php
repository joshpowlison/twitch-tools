<?php
error_reporting(1);

// Load the save data
if(!empty($_GET['load'])){
	$saveData = [];
	
	// Load in heckle keyframes
	$handle = opendir('assets');
	while(false !== ($entry = readdir($handle))) {
		// Skip over hidden files and folders
		if($entry[0] == '.')	continue;
		// if(!is_dir($entry))		continue;
		if($entry == 'gui.css')	continue;
		if($entry == 'gui.js')	continue;
		
		$saveData['keyframes'][$entry] = file_get_contents('assets/'.$entry.'/animation.css');
	}
	
	// Load in triggers
	$saveData['triggers'] = json_decode(file_get_contents('triggers.json'),true);

	die(json_encode($saveData));
}

// If saving with this, get it
if(!empty($_POST['data'])){
	$data = json_decode($_POST['data'],true);
	
	file_put_contents(
		'assets/'.$data['path'].'/animation.css'
		,$data['keyframes']
	);
	die('Saved successfully.');
}

// If saving with this, get it
if(!empty($_POST['triggers'])){
	file_put_contents(
		'triggers.json'
		,$_POST['triggers']
	);
	die('Saved successfully.');
}

// If loading a file with this, get it
if(!empty($_GET['audiopath'])){
	$file = 'assets/'.$_GET['audiopath'].'/audio.mp3';

	header('Content-Type: audio/mp3');
	header('Accept-Ranges: bytes');
	header('Content-Length:'.filesize($file));

	readfile($file);
	exit;
}

/*
/// TODO:

- I can automatically add Heckle rewards to Twitch, based on what's in the folder; I can even update them if I want to

https://dev.twitch.tv/docs/api/reference#get-custom-reward

- Have it let people know if there are errors with things

- Heckle bugs:
	- Let user know if they are using an invalid name (else, invisibly adjust the name to make it valid)
	- Don't let users adjust animation values while it's animating
	- Add in a help button that displays all of the controls
	- Make the first play of an animation work

*/
	
?><div id="body" tabindex="0">
	<style id="style-animation">
		@keyframes animation{
			100%{transform:translate(50%,0%);}
			0%{transform:translate(-50%,0%);}
			50%{transform:translate(80%,50%);}
		}
	</style>

	<header>
		<div id="project-title"><h1>ViewerImpact<span id="project-creator"><small><a href="#" target="_blank" onClick="window.open('../viewerimpact/browser-source.html','_blank','width=1920,height=1080,top=0,left=0,location=yes,menubar=yes,status=yes,toolbar=yes,titlebar=yes');">Test Browser Source</a></small></div>
		<table id="project-options">
			<!--<tr>
				<td>Twitch User</td>
				<td>
					<select id="option-twitch-user">
						<option>1</option>
						<option>2</option>
					</select>
				</td>
			</tr>-->
			<tr>
				<td class="option-name">Background</td>
				<td class="option-value">
					<select id="option-background">
						<option value="default">Default</option>
						<option value="clear">Clear</option>
						<option value="image">Image</option>
						<option value="webcam">Webcam</option>
						<option value="screen">Screen</option>
					</select>
				</td>
			</tr>
			<!--<tr>
				<td>On End</td>
				<td>
					<select id="option-on-end">
						<option>Stop</option>
						<option>Loop</option>
						<option>Play Next</option>
						<option>Pause at End</option>
						<option>Start from Cursor</option>
					</select>
				</td>
			</tr>-->
		</table>
		<div id="tabs"></div>
	</header>

	<canvas id="scrubber" width="1000" height="80" draggable=false></canvas>

	<div id="controls">
		<div id="control-player">
			<!-- <button id="control-pause">Frozen</button> -->
			<button id="control-play" title="Play/Pause (Space)"></button>
			<button id="control-save" title="Save"></button>
		</div>
		
		<div id="control-transform">
			<div class="control-transform-group">x<input type="number" id="control-transform-translate-x"></div>
			<div class="control-transform-group">y<input type="number" id="control-transform-translate-y"></div>
			<div class="control-transform-group">scale-x<input type="number" id="control-transform-scale-x" step=".1"></div>
			<div class="control-transform-group">scale-y<input type="number" id="control-transform-scale-y" step=".1"></div>
			<div class="control-transform-group">skew-x<input type="number" id="control-transform-skew-x" step=".1"></div>
			<div class="control-transform-group">skew-y<input type="number" id="control-transform-skew-y" step=".1"></div>
			<div class="control-transform-group">opacity<input type="number" id="control-transform-opacity" min="0" max="1" step=".1"></div>
		</div>
		
		<p id="control-time">0.00s/0.00s</p>
	</div>

	<main>
		<div id="frame-holder"></div>
		<video id="frame-background" class="default" autoplay="true"></video>
	</main>

	<!--<div>
		<table>
			<tr><th>Controls</th><th>Action</th></tr>
			<tr><td>Space</td><td>Play/Pause</td></tr>
			<tr><td>Right Click (on Scrubber)</td><td>Delete Keyframes</td></tr>
			<tr><td>Left Click + Drag / Arrow Keys</td><td>Move</td></tr>
			<tr><td>Left Click + Alt + Drag</td><td>Scale Free</td></tr>
			<tr><td>Right Click + Drag</td><td>Skew</td></tr>
			<tr><td>Mouse Wheel / - +</td><td>Scale</td></tr>
			<tr><td>Mouse Wheel + Alt / [ ]</td><td>Rotate</td></tr>
			<tr><td>Middle Click + Drag</td><td>Opacity</td></tr>
		</table>
		<p>Browser source must be 1920x1080. You may have to refresh it after updating animations here. Name the Channel Reward after your heckle (all lowercase, no spaces) and add "!hecklebyJoshPowlison" at the end of the reward description.</p>
	</div>-->
	<footer></footer>
</div>