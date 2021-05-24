<div id="body" tabindex="0">
	<header>
		<h1>Puppetshow</h1>
		<p><a href="#" target="_blank" onClick="window.open('../puppetshow/browser-source.html','_blank','width=1920,height=1080,top=0,left=0,location=yes,menubar=yes,status=yes,toolbar=yes,titlebar=yes');return false;">Test Browser Source</a></p>
	</header>
	<ul>
		<li>Add <em>browser-source.html</em> to your streaming software. Set its width to "1920", and its height to "1080"</li>
		<li>Right-click on the item in the preview, and select Fit to Screen</li>
		<li>Space shows and hides the puppet show</li>
		<li>WASD controls the left puppet</li>
		<li>Arrow Keys control the right puppet</li>
		<li>Left Shift and Left Ctrl on change the left puppet's images</li>
		<li>Right Shift and Right Ctrl change the right puppet's images</li>
		<?php
		
		$saveData = [
			'puppets' => [],
			'lastUpdated' => time()
		];
		
		// Load in puppet data
		$puppetId = 0;
		$dirAsset = opendir('save/assets');
		
		while(false !== ($entryPuppet = readdir($dirAsset))) {
			// Skip over hidden files and folders
			if($entryPuppet[0] == '.') continue;
			if($entryPuppet == 'puppets.json') continue;
			
			$saveData['puppets'][$puppetId] = [
				'folder' => $entryPuppet,
				'images' => []
			];
			
			$puppetImageId = 0;
			$dirPuppet = opendir('save/assets/' . $entryPuppet);
			while(false !== ($entryImage = readdir($dirPuppet))) {
				// Skip over hidden files and folders
				if($entryImage[0] == '.') continue;
				
				$saveData['puppets'][$puppetId]['images'][] = $entryImage;
				$puppetImageId ++;
			}
			
			$puppetId ++;
			
			// Save data
			file_put_contents(
				'save/puppets.json'
				,json_encode($saveData,JSON_PRETTY_PRINT)
			);
		}
		
		?>
		<p></p>
	</ul>
	<div id="puppet-info"></div>
	<p id="is-admin" style="display:none"></p>
</div>