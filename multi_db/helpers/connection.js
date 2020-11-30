const ConnectionBase = require( '../../helpers/connection' );
const Factory = require( '../../helpers/factory' );

let CONFIG = {
	DB: Factory.getConfig( 'db' ) || {},
};

class Connection extends ConnectionBase {

	/**
	* @constructor
	* @param {string} channelId
	* @param {object} config
	*/
	constructor( channelId, config = null ) {
		super( config );

		this.channelId = channelId;

		if ( !channelId || !CONFIG.DB.DATABASE_APP ) return;

		this.channelId += '_' + CONFIG.DB.DATABASE_APP;
	}

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
	* Get database name of channel
	* @override
	* @param {boolean} isDefaultDBName
	* @return {string} Database name
	*/
	getDBName( isDefaultDBName = false ) {
		if ( isDefaultDBName ) return super.getDBName();

		return super.getDBName() + ( this.channelId ? ( '_' + this.channelId ) : '' );
	}

}

module.exports = Connection;
