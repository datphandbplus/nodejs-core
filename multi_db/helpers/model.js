const Q = require( 'q' );
const _ = require( 'underscore' );

const Connection = require( './connection' );
const Logger = require( './logger' );
const Factory = require( '../../helpers/factory' );

const STATUS_CODE = Factory.getResource( 'http_status_code' );

class Model {

	/**
	* @constructor
	* @param {string} channelId
	*/
	constructor( channelId ) {
		this.channelId = channelId;
	}

	/**
	* Get transaction
	* @param {object} options - Transaction options
	* @param {function} callBack - Transaction callback
	* @return {any} Transaction
	*/
	async transaction( options = null, callBack = null ) {
		try {
			await this.generate();
			return new Connection( this.channelId ).getConnection().transaction( options, callBack );
		} catch ( error ) {
			new Logger().write( 'error', error, this.channelId );
		}
	}

	/**
	* General channel models
	* @param {array} models
	* @return {promise}
	*/
	generate( models = [] ) {
		const deferred = Q.defer();

		if ( !this.channelId ) {
			deferred.reject({
				status	: STATUS_CODE.BAD_REQUEST,
				message	: 'MISSING_CHANNEL_ID',
			});
			return deferred.promise;
		}

		return Q.all( models );
	}

	/**
	* Create model promise function
	* @param {function} f - Model
	* @return {promise}
	*/
	createPromiseFunc( f ) {
		const deferred = Q.defer();

		if ( !_.isFunction( f ) ) {
			deferred.reject();
			return deferred.promise;
		}

		return f( this.channelId );
	}

}

module.exports = Model;
