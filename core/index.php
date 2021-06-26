<!DOCTYPE html>
<html>
<head>
	<title>Stream Perfection by Josh Powlison</title>
	<meta charset="UTF-8">
	<link rel="stylesheet" href="styles.css">
</head><?php

error_reporting(1);

const SECRET_PATH = '../secret.json';
const CLIENT_ID = 'aywfg6aajo5bwx8xewxhk534k5ln4h';

// If received the username (this is received before Twitch ID and OAUTH token)
if(!empty($_POST['username'])){
	file_put_contents(
		SECRET_PATH
		,$_POST['username']
	);
}

// If received a Twitch ID and OAUTH token (this is received after username, via user input)
if(!empty($_POST['auth'])){
	$username = file_get_contents(SECRET_PATH);
	$OAuth = preg_split('/[\\r\\n]+/', $_POST['auth']);
	
	// Organize the data cleanly
	$data = [
		'username'		=> $username,
		'userId'		=> $OAuth[0],
		'oauthToken'	=> 'oauth:' . $OAuth[1],
		'channels'		=> [$username]
	];
	
	file_put_contents(
		SECRET_PATH
		,json_encode($data)
	);
}

// If we're starting up, print out the basic page
if(!file_exists(SECRET_PATH) || !empty($_POST['auth'])){ ?>
<body>
<header>
<div id="twitch-authorization">
	<h2>Welcome to Stream Perfection by Josh Powlison!</h2>
	<p>To get started, you'll need to input your Twitch username and authorize Twitch access.</p>
	<form action="https://id.twitch.tv/oauth2/authorize?client_id=<?php echo CLIENT_ID; ?>&redirect_uri=http://localhost:81/core/index.php&response_type=token&scope=channel:read:redemptions%20bits:read%20channel:read:hype_train%20channel:read:subscriptions%20chat:read%20chat:edit%20channel:moderate" id="login-form" method="post">
		<input tabindex="0" id="login-username" placeholder="Your Twitch Username">
		<button>Connect with Account</button>
	</form>
</div>
</header>
<script>
	document.getElementById('login-form').addEventListener('submit',async function(event){
		event.preventDefault();
		
		// Pass the data for the animation we want to save
		var formdata = new FormData();
		formdata.append('username',document.getElementById('login-username').value.toLowerCase());
		
		await fetch('index.php',{
			method:'POST'
			,body:formdata
		})
		.then(response => response.text())
		.then(text => {console.log(text);});
		
		// Redirect to the Twitch login
		location.href = this.action;
		return false;
	});
</script>
</body>
<?php

// Don't show anything else until the user logs in
die();
}

require '../settings.php'; 

?>
<body>
	<header>
		<img id="logo" src="logo.png">
		<p></p>
		<nav id="social-links">
			<p><a href="https://joshpowlison.com/" target="_blank">Website</a></p>
			<p><a href="https://twitch.tv/joshpowlison/" target="_blank">Twitch</a></p>
			<p><a href="https://youtube.com/joshpowlison/" target="_blank">YouTube</a></p>
			<p><a href="https://twitter.com/joshpowlison/" target="_blank">Twitter</a></p>
			<p><a href="https://linkedin.com/in/joshpowlison/" target="_blank">LinkedIn</a></p>
			<p><a href="https://github.com/joshpowlison/" target="_blank">GitHub</a></p>
		</nav>
		
		<p><span id="data-account"></span></p>
		<p id="channels-watching"></p>

		<p id="note"></p>
		<nav id="packages">
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
			
			echo '<button class="button-package" data-package="' , $package , '">' , $package , '</button>';
		}
	}
	?>
		</nav>
	</header>
	<main></main>
	<footer>This product includes PHP software, freely available from
     <a href="http://www.php.net/software/" target="_blank">http://www.php.net/software/</a></footer>
	<script>
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
					method	: 'POST'
					,body	: formdata
				})
				.catch(err => {
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
	<script src="main.js"></script>
	<script src="script.js"></script>
</body>
</html>