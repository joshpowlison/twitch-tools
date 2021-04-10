'use strict';

// This code is atrocious.

modules.rpstream = new function(){
	const module = this;
	
	module.name = 'rpstream';
	module.root = modules[module.name];

	///////////////////
	//// VARIABLES ////
	///////////////////

	module.saveData = {};

	module.currentScenario = null;
	module.scenarioDelay	= 60 * 15;			// 15 minutes
	module.nextScenarioIn	= module.scenarioDelay;

	///////////////////
	//// FUNCTIONS ////
	///////////////////

	// Get a random number between a range
	function RandRange(min,max){
		return (Math.random() * (max - min)) + min;
	}

	// Wait for a certain number of milliseconds (must call with "await")
	async function wait(milliseconds){
		return new Promise((resolve,reject) => {
			setTimeout(resolve,milliseconds);
		});
	}

	///////////////////
	//// LISTENERS ////
	///////////////////

	// The Loop
	document.addEventListener('livestreamloop',function(event){
		// If no scenario is currently running
		if(module.currentScenario === null){
			module.nextScenarioIn -= event.detail.sDeltaTime;
			module.root.getElementById('display-time').innerHTML = 'Next Scenario In: ' + Math.ceil(module.nextScenarioIn) + ' seconds';
			// Start a new scenario
			if(module.nextScenarioIn <= 0){
				runScenario(Math.round(RandRange(0,module.saveData.scenarios.length - 1)));
			}
		}
	});

	document.addEventListener('livestreamchatmessage',function(event){
		if(module.currentScenario === null)
			return;

		var data = event.detail;
		
		// If person is rolling
		if(/!roll/.test(data.message)){
			console.log(data);
			// Add in delay so we don't go over the max number of messages
			
			// Respond to user
			// var diceValue = 20;
			var diceValue = Math.round(RandRange(1,20));
			var response = '(' + diceValue + ') @' + data.display_package.name + ' ';
			
			response += module.saveData.scenarios[module.currentScenario]['roll' + diceValue];
			
			console.log(response);
			postChatMessage(response);
			
			// Take points as needed
			if(module.saveData.scenarios[module.currentScenario]['roll' + diceValue + 'points'] < 0) postChatMessage('!takepoints @' + data.display_package.name + ' ' + module.saveData.scenarios[module.currentScenario]['roll' + diceValue + 'points'].replace('-',''));
			
			// Add points as needed
			if(module.saveData.scenarios[module.currentScenario]['roll' + diceValue + 'points'] > 0) postChatMessage('!addpoints @' + data.display_package.name + ' ' + module.saveData.scenarios[module.currentScenario]['roll' + diceValue + 'points']);
			
			// If a Nat 1, timeout the user
			if(diceValue === 1){
				postChatMessage('/timeout @' + data.display_package.name + ' 10');
			}
			
			// If a Nat 20, give 5000 points to the user and everyone else in chat
			if(diceValue === 20){
				// Add points, if the value is positive
				if(module.saveData.scenarios[module.currentScenario]['chatreward'] > 0) postChatMessage('!addpoints chat ' + module.saveData.scenarios[module.currentScenario]['chatreward']);
				
				// Remove points, if the value is negative
				if(module.saveData.scenarios[module.currentScenario]['chatreward'] < 0) postChatMessage('!takepoints chat ' + module.saveData.scenarios[module.currentScenario]['chatreward'].replace('-',''));
				
				// End the current scenario and start the delay to the next one
				module.currentScenario = null;
				module.nextScenarioIn = module.scenarioDelay;
			}
		}
	});

	function runScenario(id){
		module.currentScenario = id;
		module.root.getElementById('display-time').innerHTML = 'Scenario Happening Now!';
		postChatMessage(module.saveData.scenarios[module.currentScenario].prompt + ' !roll');
	}

	function addScenario(details = null){
		// If this is a new scenario, add it to the list
		if(details === null){
			details = {
				'prompt'		: 'PROMPT'
				,'roll1'		: 'RESPONSE FOR 1'
				,'roll2'		: 'RESPONSE FOR 2'
				,'roll3'		: 'RESPONSE FOR 3'
				,'roll4'		: 'RESPONSE FOR 4'
				,'roll5'		: 'RESPONSE FOR 5'
				,'roll6'		: 'RESPONSE FOR 6'
				,'roll7'		: 'RESPONSE FOR 7'
				,'roll8'		: 'RESPONSE FOR 8'
				,'roll9'		: 'RESPONSE FOR 9'
				,'roll10'		: 'RESPONSE FOR 10'
				,'roll11'		: 'RESPONSE FOR 11'
				,'roll12'		: 'RESPONSE FOR 12'
				,'roll13'		: 'RESPONSE FOR 13'
				,'roll14'		: 'RESPONSE FOR 14'
				,'roll15'		: 'RESPONSE FOR 15'
				,'roll16'		: 'RESPONSE FOR 16'
				,'roll17'		: 'RESPONSE FOR 17'
				,'roll18'		: 'RESPONSE FOR 18'
				,'roll19'		: 'RESPONSE FOR 19'
				,'roll20'		: 'RESPONSE FOR 20'
				,'roll1points'	: -1000
				,'roll2points'	: -500
				,'roll3points'	: -250
				,'roll4points'	: -100
				,'roll5points'	: 0
				,'roll6points'	: 0
				,'roll7points'	: 0
				,'roll8points'	: 0
				,'roll9points'	: 0
				,'roll10points'	: 0
				,'roll11points'	: 0
				,'roll12points'	: 0
				,'roll13points'	: 0
				,'roll14points'	: 0
				,'roll15points'	: 0
				,'roll16points'	: 0
				,'roll17points'	: 0
				,'roll18points'	: 0
				,'roll19points'	: 0
				,'roll20points'	: 5000
				,'chatreward'	: 5000
			};
		}
		
		// Create an id for this element, so we can grab it later
		var elementId = (new Date().getTime()) + '-' + module.root.querySelectorAll('.option').length;
		
		// Create the scenario element
		var table = document.createElement('table');
		table.name = 'option';
		table.dataset.id = elementId;
		
		var td, tr, button, input;
		
		tr = document.createElement('tr');
		
		td = document.createElement('td');
		td.innerHTML = 'Prompt';
		tr.appendChild(td);
		
		td = document.createElement('td');
		input = document.createElement('input');
		input.value = details.prompt;
		input.name = 'prompt';
		input.addEventListener('change',saveBackup);
		td.appendChild(input);
		tr.appendChild(td);
		
		td = document.createElement('td');
		input = document.createElement('input');
		input.name = 'points';
		input.type = 'number';
		input.name = 'chatreward';
		input.value = details.chatreward;
		input.addEventListener('change',saveBackup);
		td.appendChild(input);
		
		var span = document.createElement('span');
		span.innerHTML = ' Points';
		td.appendChild(span);
		
		tr.appendChild(td);
		table.appendChild(tr);
		
		for(var i = 1; i <= 20; i ++){
			tr = document.createElement('tr');
			
			td = document.createElement('td');
			td.innerHTML = 'Roll ' + i;
			tr.appendChild(td);
				
			td = document.createElement('td');
			td.innerHTML = '(DD) @User';
			input = document.createElement('input');
			input.value = details['roll' + i];
			input.name = 'roll' + i;
			input.addEventListener('change',saveBackup);
			td.appendChild(input);
			
			tr.appendChild(td);
			
			td = document.createElement('td');
			//td.innerHTML = '(DD) @User';
			input = document.createElement('input');
			input.name = 'points';
			input.type = 'number';
			input.name = 'roll' + i + 'points';
			input.value = details['roll' + i + 'points'];
			input.addEventListener('change',saveBackup);
			td.appendChild(input);
			
			var span = document.createElement('span');
			span.innerHTML = ' Points';
			td.appendChild(span);
			
			tr.appendChild(td);
			table.appendChild(tr);
		}
		
		// Append the elements with event listeners
		tr = document.createElement('tr');
		
		td = document.createElement('td');
		button = document.createElement('button');
		button.innerHTML = 'Run Now';
		button.addEventListener('click',function(){runScenarioByElementId(elementId);});
		td.appendChild(button);
		tr.appendChild(td);
		
		td = document.createElement('td');
		button = document.createElement('button');
		button.innerHTML = 'Remove Scenario';
		button.addEventListener('click',function(){removeScenario(elementId);});
		td.appendChild(button);
		tr.appendChild(td);
		
		td = document.createElement('td');
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		// Append it. This is necessary instead of innerHTML+=, because that will overwrite input values with their defaults
		module.root.getElementById('scenarios-container').appendChild(table);
	}

	// Remove a scenario from the view and from the save data
	function removeScenario(elementId){
		// Look through all the options for one with a matching id
		var elements = module.root.querySelectorAll('.option');
		for(var i = 0, l = elements.length; i < l; i ++){
			// If the id matches:
			if(elements[i].dataset.id === elementId){
				// Remove the element
				module.root.querySelector('[data-id="' + elementId + '"]').remove();
				// Remove it from module.saveData
				module.saveData.scenarios.splice(i,1);
				break;
			}
		}
		
		// Save this data update
		saveBackup();
	}

	function runScenarioByElementId(elementId){
		// Look through all the options for one with a matching id
		var elements = module.root.querySelectorAll('.option');
		for(var i = 0, l = elements.length; i < l; i ++){
			// If the id matches:
			if(elements[i].dataset.id === elementId){
				// Run the scenario
				runScenario(i);
				break;
			}
		}
	}

	var saving = false;
	function saveBackup(){
		// Update data
		// Save to PHP
		
		// Get all of the options and update the module.saveData.scenarios object based on them
		module.saveData.scenarios = [];
		var options = module.root.querySelectorAll('.option');
		for(var i = 0, l = options.length; i < l; i ++){
			console.log(options[i]);
			
			// Start tracking data for this value
			var data = {
				'prompt'		: options[i].querySelector('input[name="prompt"]').value
				,'chatreward'	: options[i].querySelector('input[name="chatreward"]').value
			};
			
			// 
			for(var ii = 1, ll = 20; ii <= ll; ii ++){
				data['roll' + ii] = options[i].querySelector('input[name="roll' + ii + '"]').value;
				data['roll' + ii + 'points'] = options[i].querySelector('input[name="roll' + ii + 'points"]').value;
			}
			
			module.saveData.scenarios.push(data);
		}
		
		/// Save to file with PHP
		if(saving) return;
		saving = true;
		
		var formdata = new FormData();
		formdata.append('data',JSON.stringify(module.saveData,null,'\t'));
		fetch('../rpstream/save.php',{
			method:'POST'
			,body:formdata
		})
		.then(response => response.text())
		.then(text => {
			module.saveData = JSON.parse(text);
			saving = false;
		});
	}

	function start(){
		fetch('../rpstream/save.php')
		.then(response => response.text())
		.then(text => {
			console.log(text);
			module.saveData = JSON.parse(text);
			
			for(var i = 0, l = module.saveData.scenarios.length; i < l; i ++){
				addScenario(module.saveData.scenarios[i]);
			}
			
			module.root.getElementById('scenario-add').addEventListener('click',function(){
				addScenario();
				saveBackup();
			});
		});
	}

	start();
}();