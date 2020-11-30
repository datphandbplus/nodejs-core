#!/usr/bin/env node
'use strict';

const inquirer = require( 'inquirer' );
const fs = require( 'fs' );

const CURR_DIR = process.cwd();
const TEMPLATE_PATH = process.env.MULTI_DB === 'true' ? `${__dirname}/../multi_db/templates` : `${__dirname}/../templates`;

/* eslint-disable-next-line */
function readDir( dir ) {
	return fs.existsSync( dir )
		? fs.readdirSync( dir ).filter( item => !( /(^|\/)\.[^\/\.]/g ).test( item ) )
		: [];
}

/* eslint-disable-next-line */
function parseContents( module, object, contents ) {
	contents = contents.replace(
		/#{module_snake_case}/g,
		module.toLowerCase()
	);
	contents = contents.replace(
		/#{object_uppercase}/g,
		object.toUpperCase()
	);
	contents = contents.replace(
		/#{object_snake_case}/g,
		object.toLowerCase()
	);
	contents = contents.replace(
		/#{object_camel_case}/g,
		object
		.split( '_' )
		.map( ( name, index ) => {
			if ( !index ) return name.toLowerCase();
			return name[ 0 ].toUpperCase() + name.slice( 1 ).toLowerCase();
		} )
		.join( '' )
	);
	contents = contents.replace(
		/#{object_pascal_case}/g,
		object
		.split( '_' )
		.map( name => name[ 0 ].toUpperCase() + name.slice( 1 ).toLowerCase() )
		.join( '' )
	);
	contents = contents.replace(
		/#{object}/g,
		object
		.replace( /_/g, ' ' )
		.toLowerCase()
	);

	return contents;
}

/* eslint-disable-next-line */
function createModelFile( object, module, subModule = null ) {
	const modulePath = `${CURR_DIR}/models/${module}`;
	const subModulePath = `${modulePath}/${subModule || object}`;

	let modelContents = fs.readFileSync( `${TEMPLATE_PATH}/model`, 'utf8' );
	let repositoryContents = fs.readFileSync( `${TEMPLATE_PATH}/repository`, 'utf8' );

	modelContents = parseContents( module, object, modelContents );
	repositoryContents = parseContents( module, object, repositoryContents );

	!fs.existsSync( modulePath ) && fs.mkdirSync( modulePath );
	!fs.existsSync( subModulePath ) && fs.mkdirSync( subModulePath );

	if ( fs.existsSync( `${subModulePath}/${object}.js` )
		|| fs.existsSync( `${subModulePath}/${object}_repository.js` ) ) {
		throw new Error( `${object} model has already existed.` );
		return;
	}

	fs.writeFileSync( `${subModulePath}/${object}.js`, modelContents, 'utf8' );
	fs.writeFileSync( `${subModulePath}/${object}_repository.js`, repositoryContents, 'utf8' );
}

/* eslint-disable-next-line */
function createHandlerFile(
	object, module, subModule = null,
	modelSubModule = null, modelObject = null
) {
	const modulePath = `${CURR_DIR}/handlers/${module}`;
	const subModulePath = `${modulePath}/${subModule || object}`;

	let contents = fs.readFileSync( `${TEMPLATE_PATH}/handler`, 'utf8' );

	contents = contents.replace( /#{model_sub_module}/g, modelSubModule || object );
	contents = parseContents( module, object, contents );

	!fs.existsSync( modulePath ) && fs.mkdirSync( modulePath );
	!fs.existsSync( subModulePath ) && fs.mkdirSync( subModulePath );

	if ( fs.existsSync( `${subModulePath}/${object}.js` ) ) {
		throw new Error( `${object} handler has already existed.` );
		return;
	}

	fs.writeFileSync( `${subModulePath}/${object}.js`, contents, 'utf8' );
}

/* eslint-disable-next-line */
function createRouteFile(
	object, module, subModule = null,
	handlerSubModule = null, handlerObject = null
) {
	const modulePath = `${CURR_DIR}/routes/api/${module}`;
	const subModulePath = `${modulePath}/${subModule || object}`;

	let contents = fs.readFileSync( `${TEMPLATE_PATH}/route`, 'utf8' );

	contents = contents.replace( /#{handler_sub_module}/g, handlerSubModule || object );
	contents = parseContents( module, object, contents );

	!fs.existsSync( modulePath ) && fs.mkdirSync( modulePath );
	!fs.existsSync( subModulePath ) && fs.mkdirSync( subModulePath );

	if ( fs.existsSync( `${subModulePath}/${object}.js` ) ) {
		throw new Error( `${object} route has already existed.` );
		return;
	}

	fs.writeFileSync( `${subModulePath}/${object}.js`, contents, 'utf8' );
}

inquirer.prompt([
	{
		name	: 'module-choice',
		type	: 'list',
		message	: 'What module would you like to generate new object?',
		choices: [
			...readDir( `${CURR_DIR}/handlers` ),
			new inquirer.Separator( '--- or ---' ),
			'generate new module',
		],
	},
	{
		name	: 'module-name',
		type	: 'input',
		message	: 'New module name:',
		when	: answers => answers[ 'module-choice' ] === 'generate new module',
		validate: input => {
			if ( /^([a-z\_])+$/.test( input ) ) return true;
			return 'Module name may only include lowercase letters, underscores.';
		},
	},
	{
		name	: 'object-name',
		type	: 'input',
		message	: 'New object name:',
		validate: input => {
			if ( /^([a-z\_])+$/.test( input ) ) return true;
			return 'Object may only include lowercase letters, underscores.';
		},
	},
]).then( async answers => {
	const module = answers[ 'module-name' ] || answers[ 'module-choice' ];
	const object = answers[ 'object-name' ];
	const subModule = [
		new inquirer.Separator( '--- new sub module ---' ),
		object,
		new inquirer.Separator( '--- new sub module ---' ),
	];

	// Questions for model
	const modelAnswers = await inquirer.prompt([
		{
			name	: 'confirm',
			type	: 'confirm',
			message	: `Would you like to generate ${object}\'s model?`,
		},
		{
			name	: 'submodule-choice',
			type	: 'list',
			message	: `What submodule would you like to generate ${object}\'s model?`,
			when	: _answers => _answers[ 'confirm' ] && answers[ 'module-choice' ] !== 'generate new module',
			choices: [
				...subModule,
				...readDir( `${CURR_DIR}/models/${module}` ),
			],
		},
	]);

	// Questions for handler
	const handlerAnswers = await inquirer.prompt([
		{
			name	: 'confirm',
			type	: 'confirm',
			message	: `Would you like to generate ${object}\'s handler?`,
		},
		{
			name	: 'submodule-choice',
			type	: 'list',
			message	: `What submodule would you like to generate ${object}\'s handler?`,
			when	: _answers => _answers[ 'confirm' ] && answers[ 'module-choice' ] !== 'generate new module',
			choices: [
				...subModule,
				...readDir( `${CURR_DIR}/handlers/${module}` ),
			],
		},
	]);

	// Questions for route
	const routeAnswers = await inquirer.prompt([
		{
			name	: 'confirm',
			type	: 'confirm',
			message	: `Would you like to generate ${object}\'s route?`,
		},
		{
			name	: 'submodule-choice',
			type	: 'list',
			message	: `What submodule would you like to generate ${object}\'s route?`,
			when	: _answers => _answers[ 'confirm' ] && answers[ 'module-choice' ] !== 'generate new module',
			choices: [
				...subModule,
				...readDir( `${CURR_DIR}/routes/api/${module}` ),
			],
		},
	]);

	// Generate model
	modelAnswers[ 'confirm' ] && createModelFile(
		object, module, modelAnswers[ 'submodule-choice' ]
	);

	// Generate handler
	handlerAnswers[ 'confirm' ] && createHandlerFile(
		object, module,
		handlerAnswers[ 'submodule-choice' ],
		modelAnswers[ 'submodule-choice' ]
	);

	// Generate route
	routeAnswers[ 'confirm' ] && createRouteFile(
		object, module,
		routeAnswers[ 'submodule-choice' ],
		handlerAnswers[ 'submodule-choice' ]
	);
} );
