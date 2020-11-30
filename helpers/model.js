const Q = require( 'q' );
const _ = require( 'underscore' );

const Connection = require( './connection' );
const Logger = require( './logger' );

class Model {

	/**
	* Get transaction
	* @param {object} options - Transaction options
	* @param {function} callBack - Transaction callback
	* @return {any} Transaction
	*/
	async transaction( options = null, callBack = null ) {
		try {
			await this.generate();
			return new Connection().getConnection().transaction( options, callBack );
		} catch ( error ) {
			new Logger().write( 'error', error );
		}
	}

	/**
	* General models
	* @param {array} models
	* @return {promise}
	*/
	generate( models = [] ) {
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

		return f();
	}

}

module.exports = Model;
