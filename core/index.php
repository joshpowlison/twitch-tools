<?php

error_reporting(1);

const SECRET_PATH = '../secret.json';
const CLIENT_ID = 'aywfg6aajo5bwx8xewxhk534k5ln4h';

// If received the username (this is received before Twitch ID and OAUTH token)
if(!empty($_POST['username'])){
	file_put_contents(
		SECRET_PATH
		,$_POST['username'] . PHP_EOL
	);
}

// If received a Twitch ID and OAUTH token (this is received after username, via user input)
if(!empty($_POST['auth'])){
	// die($_POST['auth']);
	file_put_contents(
		SECRET_PATH
		// ,json_encode($_POST)
		,$_POST['auth']
		,FILE_APPEND
	);
}

// If we're starting up, print out the basic page
if(!file_exists(SECRET_PATH)){ ?>
<!DOCTYPE html>
<head>
	<title>Get Login Data</title>
	<meta charset="utf-8"></meta>
</head>
<body>
<div id="twitch-authorization">
	<h2>Welcome to Twitch Tools!</h2>
	<p>To get started, you'll need to input your Twitch username and authorize Twitch access.</p>
	<form action="https://id.twitch.tv/oauth2/authorize?client_id=<?php echo CLIENT_ID; ?>&redirect_uri=http://localhost:81/start.php&response_type=token&scope=channel:read:redemptions%20bits:read%20channel:read:hype_train%20channel:read:subscriptions%20chat:read" id="login-form" method="post">
		<input tabindex="0" id="login-username" placeholder="Your Twitch Username">
		<button>Connect with Account</button>
	</form>
</div>
<script>
	document.getElementById('login-form').addEventListener('submit',async function(event){
		event.preventDefault();
		
		// Pass the data for the animation we want to save
		var formdata = new FormData();
		formdata.append('username',document.getElementById('login-username').value.toLowerCase());
		
		await fetch('gui.php',{
			method:'POST'
			,body:formdata
		})
		.then(response => response.text())
		.then(text => {console.log(text);});
		
		// Redirect to the Twitch login
		location.href = this.action;
		return false;
	});

	// Get token hashes so we can save them to the local file for the user
	if(document.location.hash) {
		// Get the hash and remove the hash from the URL
		var parsedHash = new URLSearchParams(window.location.hash.substr(1));
		history.pushState('', document.title, window.location.pathname + window.location.search);

		if (parsedHash.get('access_token')) {
			var access_token = parsedHash.get('access_token');

			// call API
			fetch('https://api.twitch.tv/helix/users',
				{
					'headers': {
						'Client-ID': <?php echo json_encode(CLIENT_ID); ?>,
						'Authorization': 'Bearer ' + access_token
					}
				}
			)
			.then(response => response.json())
			.then(response => {
				// Pass the data to PHP we want to save
				var formdata = new FormData();
				formdata.append('auth',response.data[0].id + '\n' + access_token);
				
				fetch('index.php',{
					method:'POST'
					,body:formdata
				})
				.then(response => response.text())
				.then(text => {
					document.getElementById('welcome-page').remove();
				}).catch(err => {
					console.log(err);
					document.getElementById('twitch-authorization').innerHTML = 'Authorization Failed! Refresh and try again, or contact JoshPowlison.';
				});
			})
			.catch(err => {
				console.log(err);
				document.getElementById('twitch-authorization').innerHTML = 'Authorization Failed! Refresh and try again, or contact JoshPowlison.';
			});
		}
	}
</script>
</body>
<?php

// Don't show anything else until the user logs in
die();
}

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