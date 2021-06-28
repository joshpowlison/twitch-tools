'use strict';

modules.notebook = new function(){
	const module		= this;
	module.name			= 'notebook';
	module.root			= modules[module.name];
	module.isAdminPanel	= (module.root.querySelector('#is-admin') !=null);
}