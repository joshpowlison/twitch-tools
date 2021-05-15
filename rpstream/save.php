<?php

if(!empty($_POST['data']))
	file_put_contents('save/scenarios.json',$_POST['data']);

readfile('save/scenarios.json');

?>