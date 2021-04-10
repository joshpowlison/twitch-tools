<?php

require '../settings.php'; 
/*
$ch = curl_init('https://api.twitch.tv/helix/users?id=1233');
// curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    // 'Authorization: ' . SETTINGS['oauthToken']
// ));
curl_setopt($ch, CURLOPT_HEADER, array(
	'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y'
));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$r = curl_exec($ch);
$i = curl_getinfo($ch);
curl_close($ch);

die(json_encode($i));*/

/*

fetch(
	'https://api.twitch.tv/helix/users?id=1233'
	,{
		headers: {
			'Authorization': 'Bearer ' + SETTINGS.oauthToken //,
			//'Client-Id': 'uo6dggojyb8d6soh92zknwmi5ej1q2'
		}
	}
)
.then(response => response.text())
.then(text => {
	console.log(text);
});

*/

?><!DOCTYPE html>
<html>
<head>
	<title>Twitch Tools by Josh Powlison</title>
	<meta charset="UTF-8">
	<link rel="stylesheet" href="styles.css">
</head>
<body>
	<h1>Twitch Tools by Josh Powlison</h1>
	<p>Twitch Account: <span id="data-account"></span></p>
	<p id="channels-watching">Channels watching (this list will grow as we connect; there is an 11-second delay between every 15 connections):<br></p>

	<p>Keep this page open to keep these running!</p>
	<p id="note"></p>
	
	<?php

/*

*** EXAMPLE FROM TWITCH'S DOCS ***

curl -X GET 'https://api.twitch.tv/helix/users?id=141981764' \
-H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
-H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

*/

	// List out packages
	$handle = opendir('../');
	while(false != ($package = readdir($handle))){
		if(!preg_match('/\./',$package)){
			if($package == 'core')
				continue;
			
			echo '<div class="package" data-package="' , $package , '" onclick="loadPackage(this)"> Load ' , $package , '</div>';
		}
	}
	?>
	
	<script src="main.js"></script>
	<script src="script.js"></script>
</body>
</html>