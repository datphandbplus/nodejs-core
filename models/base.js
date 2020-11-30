const _ = require( 'underscore' );
const Umzug = require( 'umzug' );
const path = require( 'path' );
const Q = require( 'q' );
const Sequelize = require( 'sequelize' );

const Connection = require( '../helpers/connection' );
const Logger = require( '../helpers/logger' );
const Factory = require( '../helpers/factory' );

const APP_DIR = process.cwd();
const DB = Factory.getConfig( 'db' );
const models = {};
let sequelizeMeta = null;
let sequelizeModelVersions = null;

const execMigrations = async sequelize => {
	const deferred = Q.defer();

	try {
		if ( !sequelize ) {
			deferred.reject( 'Connection is required' );
			return deferred.promise;
		}

		const umzug = new Umzug({
			storage: 'sequelize',
			storageOptions: {
				sequelize,
				modelName: 'sequelize_meta',
			},
			migrations: {
				params: [
					sequelize.getQueryInterface(), // queryInterface
					sequelize.constructor, // DataTypes
					() => {
						throw new Error(
							'Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.'
						);
					},
				],
				path	: path.join( APP_DIR, '/migrations' ),
				pattern	: /\.js$/,
			},
			logging: () => {},
		});

		let migrations = await umzug.pending();

		migrations = _.map( migrations, migration => migration.file );
		sequelizeMeta = await Q.all([
			umzug.execute( { migrations, method: 'up' } ),
			umzug.execute( { migrations, method: 'down' } ),
		]);

		deferred.resolve( sequelizeMeta );
	} catch ( error ) {
		deferred.reject( error );
	}

	return deferred.promise;
};

const checkModelVersion = async ( sequelize, name, version ) => {
	const deferred = Q.defer();

	try {
		if ( !sequelize ) {
			deferred.reject( 'Connection is required' );
			return deferred.promise;
		}

		if ( !name || !version ) {
			deferred.resolve( true );
			return deferred.promise;
		}

		// Create table `sequelize_model_versions`
		if ( !sequelizeModelVersions ) {
			const umzug = new Umzug({
				storage: 'sequelize',
				storageOptions: {
					sequelize,
					modelName: 'sequelize_model_versions',
				},
				logging: () => {},
			});

			sequelizeModelVersions = await umzug.pending();
		}

		// Genenrate model version
		name = [ name, version ].join( '_' );

		const versions = await sequelize.query(
			'SELECT * FROM sequelize_model_versions WHERE name = ?',
			{ replacements: [ name ], type: Sequelize.QueryTypes.SELECT }
		);

		deferred.resolve( !versions || !versions.length );
	} catch ( error ) {
		deferred.reject( error );
	}

	return deferred.promise;
};

const trackingModelVersion = ( sequelize, name, version ) => {
	const deferred = Q.defer();

	try {
		if ( !sequelize ) {
			deferred.reject( 'Connection is required' );
			return deferred.promise;
		}

		if ( !name || !version ) {
			deferred.resolve( true );
			return deferred.promise;
		}

		// Genenrate model version
		name = [ name, version ].join( '_' );

		// Tracking new version
		sequelize.query(
			'INSERT IGNORE INTO sequelize_model_versions(name) VALUES(?)',
			{ replacements: [ name ], type: Sequelize.QueryTypes.INSERT }
		);

		deferred.resolve( true );
	} catch ( error ) {
		deferred.reject( error );
	}

	return deferred.promise;
};

const checkModelError = error => {
	return (
		/^SequelizeDatabaseError: Can't write; duplicate key in table/
		.test( error.toString() )
		|| /^SequelizeDatabaseError: Deadlock found when trying to get lock; try restarting transaction/
		.test( error.toString() )
		|| /^SequelizeDatabaseError: Cannot add foreign key constraint/
		.test( error.toString() )
		|| /^SequelizeDatabaseError: Can't DROP '(.*)'; check that column\/key exists/
		.test( error.toString() )
		|| /^SequelizeDatabaseError: Duplicate foreign key constraint name/
		.test( error.toString() )
		|| /^SequelizeDatabaseError: Duplicate column name/
		.test( error.toString() )
		|| /^SequelizeDatabaseError: Duplicate key name/
		.test( error.toString() )
		|| /^SequelizeForeignKeyConstraintError: Cannot add or update a child row: a foreign key constraint fails/
		.test( error.toString() )
		|| /^SequelizeUnknownConstraintError: Constraint (.*) on table (.*) does not exist/
		.test( error.toString() )
	);
};

module.exports = {
	execMigrations, checkModelVersion,
	trackingModelVersion, checkModelError,
	get: name => {
		const model = models[ name ];

		return model && ( model.is_associated || model.is_virtual ) ? model : null;
	},
	set: ( name, model ) => {
		if ( !model ) return;

		model.is_associated = true;
		models[ name ] = model;
	},
	define: async ( name, fields, options = {} ) => {
		const deferred = Q.defer();
		const connection = new Connection();

		let model = models[ name ];

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
				options.schema = [ connection.getDBName(), options.ext_app ].join( '_' );
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
			models[ name ] = model;
		}

		// Create table if not exists
		try {
			// Check model verion changed
			const modelVersionChanged = await checkModelVersion( conn, name, DB.VERSION );

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
				if ( !checkModelError( error ) ) throw new Error( error );

				// Try sync again
				setTimeout( async () => {
					try {
						await model.sync( syncOptions );
					} catch {}
				}, 2000 );
			}

			// Execute all migrations
			await execMigrations( conn );

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
				models[ name ] = { is_virtual: true };
				deferred.resolve( null );
				return deferred.promise;
			}

			// Destroy model
			delete models[ name ];

			// Logger error
			new Logger().write( 'error', error );

			// Throw error
			deferred.reject( error );
		}

		return deferred.promise;
	},
};
