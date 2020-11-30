const Sequelize = require( 'sequelize' );

const Factory = require( './factory' );

const connections = {};

let CONFIG = {
	DB: Factory.getConfig( 'db' ) || {},
};

class Connection {

	/**
	* Set global config
	* @static
	* @param {object} config
	* @return {void}
	*/
	static setGlobalConfig( config ) {
		CONFIG = config;
	}

	/**
	* @constructor
	* @param {object} config
	*/
	constructor( config = null ) {
		this.defaultConfigs = {
			logging			: false,
			operatorsAliases: false,
			pool: {
				max					: 5,
				min					: 0,
				idle				: 100000,
				acquire				: 200000,
				handleDisconnects	: true,
			},
			retry: {
				match: [
					'ER_LOCK_DEADLOCK',
					'SequelizeDatabaseError: Deadlock found when trying to get lock; try restarting transaction',
				],
				max: 3,
			},
			...config,
		};
	}

	/**
	* Get database connection
	* @return {any} Database connection
	*/
	getConnection() {
		const dbName = this.getDBName();
		const conn = connections[ dbName ];

		if ( conn ) {
			conn.authenticate()
			.then() // Connected
			.catch( error => process.exit( 1 ) ); // Crash app when connection error

			return conn;
		}

		return this.connect( dbName );
	}

	/**
	* Connect database
	* @param {string} dbName - Database to connect
	* @return {any} Database connection
	*/
	connect( dbName ) {
		const conn = new Sequelize(
			dbName, CONFIG.DB.USER, CONFIG.DB.PASSWORD,
			{
				...this.defaultConfigs,
				host	: CONFIG.DB.HOST,
				dialect	: CONFIG.DB.TYPE,
				timezone: CONFIG.DB.TIMEZONE, // for writing from database
				dialectOptions: {
					socketPath		: CONFIG.DB.SOCKETPATH,
					decimalNumbers	: true,
				},
			}
		);

		// Enable support Cross-Schema
		conn.dialect.supports.schemas = CONFIG.DB.CROSS_SCHEMA;

		// Stored connection in global caches
		connections[ dbName ] = conn;

		return conn;
	}

	/**
	* Disconnect database connection
	* @return {void}
	*/
	disconnect() {
		const dbName = this.getDBName();
		const conn = connections[ dbName ];

		if ( !conn ) return;

		conn.close();
		delete connections[ dbName ];
	}

	/**
	* Get database name
	* @return {string} Database name
	*/
	getDBName() {
		return CONFIG.DB.DATABASE;
	}

}

module.exports = Connection;
