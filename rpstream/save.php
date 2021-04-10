<?php

if(!empty($_POST['data']))
	file_put_contents('save.json',$_POST['data']);

readfile('save.json');

?>