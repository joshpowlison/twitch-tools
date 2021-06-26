<?php

///////////////////
//// CONSTANTS ////
///////////////////

error_reporting(1);

///////////////////
//// VARIABLES ////
///////////////////

///////////////////
//// FUNCTIONS ////
///////////////////

function TestFileUploadError($error){
	if($error == UPLOAD_ERR_OK)
		return;
	
	// Error messages: http://php.net/manual/en/features.file-upload.errors.php
	die([
		'Upload okay but we\'re still here somehow!'
		,'Uploaded file size too big according to php.ini!'
		,'Uploaded file size too big according to HTML form!'
		,'File only uploaded partially!'
		,'No file found!'
		,'Missing a temporary folder!'
		,'Failed to write to disk!'
		,'A PHP extension stopped the upload!'
	][$error]);
}

///////////////////
//// START APP ////
///////////////////

chdir('save/assets');

if(!isset($_POST['name']))
	die('No name set!');

if(!isset($_FILES))
	die('No files passed!');

if(preg_match('/^[a-z]+$/', $_POST['name']) == false)
	die('Your filename must be lowercase characters only.');

TestFileUploadError($_FILES['visual']['error']);
TestFileUploadError($_FILES['audio']['error']);

if(file_exists($_POST['name']))
	die('A VFX with the name "' . $_POST['name'] . '" already exists!');

// Commands
mkdir($_POST['name']);
chdir($_POST['name']);

if(!move_uploaded_file(
	$_FILES['visual']['tmp_name']
	,basename('image.png'))
)
	die('Failed to upload the image!');

if(!move_uploaded_file(
	$_FILES['audio']['tmp_name']
	,basename('audio.mp3'))
)
	die('Failed to upload the audio!');

file_put_contents('animation.css', '@keyframes ' . $_POST['name'] . '{0%{visibility:visible;transform:matrix(1,0,0,1,0,0);opacity:1;}100%{visibility:hidden;transform:matrix(1,0,0,1,0,0);opacity:1;}}');

/*
// Delete directory or file
if(isset($_POST['delete']))
{
	if(is_dir($_POST['delete'])) rmdir($_POST['delete']);
	else unlink($_POST['delete']);
}
*/

/*
if(isset($_POST['updateFile'])){
	rename(
		$_POST['updateFile']
		,$_POST['updateDate'].' ('.$_POST['updateName'].') '.$_POST['updateLength'].'.'.pathinfo($_POST['updateFile'],PATHINFO_EXTENSION)
	);
}
*/

/*
foreach(scandir('.') as $file)
{
	if($file=='.' || $file=='..') continue;
}
*/

// <form method="POST" enctype="multipart/form-data"><input name="files[]" type="file" multiple><button>Upload File</button></form>

?>