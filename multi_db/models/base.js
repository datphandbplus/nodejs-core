const Q = require( 'q' );
const _ = require( 'underscore' );

const Connection = require( '../helpers/connection' );
const Logger = require( '../helpers/logger' );
const Factory = require( '../../helpers/factory' );
const BaseModel = require( '../../models/base' );

const models = {};
const DB = Factory.getConfig( 'db' );

module.exports = {
	execMigrations		: BaseModel.execMigrations,
	checkModelVersion	: BaseModel.checkModelVersion,
	checkModelError		: BaseModel.checkModelError,
	get: ( channelId, name ) => {
		const connection = new Connection( channelId );
		const dbName = connection.getDBName();

		// Declare global models cache
		if ( !models[ dbName ] ) models[ dbName ] = {};

		const model = models[ dbName ][ name ];

		return model && ( model.is_associated || model.is_virtual ) ? model : null;
	},
	set: ( channelId, name, model ) => {
		if ( !model ) return;

		const connection = new Connection( channelId );
		const dbName = connection.getDBName();

		// Declare global models cache
		if ( !models[ dbName ] ) models[ dbName ] = {};

		model.is_associated = true;
		models[ dbName ][ name ] = model;
	},
	define: async (
		channelId, name, fields,
		options = {}
	) => {
		const deferred = Q.defer();
		const connection = new Connection( channelId );
		const dbName = connection.getDBName();

		// Declare global models cache
		if ( !models[ dbName ] ) models[ dbName ] = {};

		let model = models[ dbName ][ name ];

		const isExternalModel = !!options.ext_app;

		// In case model has been defined
		// Ignore external model because it force sync to check exists
		if ( model && !isExternalModel ) {
			deferred.resolve( model );
			return deferred.promise;
		}

		const conn = connection.getConnection();

		if ( !model || !model.is_defined ) {
			// Auto increment from random number has length 6 numbers.
			if ( options.randomAI ) {
				options.initialAutoIncrement = Math.floor( ( Math.random() * 10 ) + 100199 );
			}

			// In case model is external then auto generate full schema path
			if ( isExternalModel && !options.schema ) {
				options.schema = [ connection.getDBName( true ), channelId, options.ext_app ].join( '_' );
			}

			// Define model
			model = conn.define(
				name, fields,
				{
					underscored	: true,
					collate		: 'utf8_general_ci',
					...options,
				}
			);

			// Set model is defined
			model.is_defined = true;

			// Cache model to avoid define once again
			models[ dbName ][ name ] = model;
		}

		// Create table if not exists
		try {
			// Check model verion changed
			const modelVersionChanged = await BaseModel.checkModelVersion( conn, name, DB.VERSION );

			// In case model version not change
			if ( !modelVersionChanged ) {
				deferred.resolve( model );
				return deferred.promise;
			}

			const syncOptions = { force: false, alter: !isExternalModel };

			// Sync model
			try {
				await model.sync( syncOptions );
			} catch ( error ) {
				// Ignore whitelist error
				if ( !BaseModel.checkModelError( error ) ) throw new Error( error );

				// Try sync again
				setTimeout( async () => {
					try {
						await model.sync( syncOptions );
					} catch {}
				}, 2000 );
			}

			// Execute all migrations
			await BaseModel.execMigrations( conn );

			// Tracking new verion
			await BaseModel.trackingModelVersion( conn, name, DB.VERSION );

			// Dump all data
			if ( options.dump ) {
				if ( options.dump.func && _.isFunction( options.dump.func ) ) {
					options.dump = options.dump.func( model, ...options.dump.args );
				}

				_.isFunction( options.dump ) && await options.dump( model );
			}

			// Return model
			deferred.resolve( model );
		} catch ( error ) {
			// In case model is external then destroy model
			if ( isExternalModel ) {
				models[ dbName ][ name ] = { is_virtual: true };
				deferred.resolve( null );
				return deferred.promise;
			}

			// Destroy model
			delete models[ dbName ][ name ];

			// Logger error
			new Logger().write( 'error', error, channelId );

			// Throw error
			deferred.reject( error );
		}

		return deferred.promise;
	},
};
