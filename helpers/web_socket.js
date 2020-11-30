const _ = require( 'underscore' );
const socketIo = require( 'socket.io' );
const redis = require( 'redis' );
const bluebird = require( 'bluebird' );

const Factory = require( './factory' );

let CONFIG = {
	SERVER	: Factory.getConfig( 'server' ) || {},
	WS		: Factory.getConfig( 'ws' ) || {},
};

let socketClients = {};

bluebird.promisifyAll( redis );

class WebSocket {

	/**
	* @constructor
	* @param {object} config
	*/
	constructor( config = null ) {
		this.io = socketIo.listen( CONFIG.WS.SOCKET || config.socket );

		if ( CONFIG.SERVER.DEFAULT_CACHE !== 'redis' ) return;

		this.redisClient = redis.createClient();
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
	* Init clients
	* @return {void}
	*/
	async initClients() {
		if ( CONFIG.SERVER.DEFAULT_CACHE !== 'redis' ) return;

		socketClients = await this.redisClient.getAsync( 'socketClients' );
		socketClients = JSON.parse( socketClients || '{}' );
	}

	/**
	* Update clients
	* @return {void}
	*/
	updateClients() {
		if ( CONFIG.SERVER.DEFAULT_CACHE !== 'redis' ) return;

		this.redisClient.set( 'socketClients', JSON.stringify( socketClients || {} ) );
	}

	/**
	* Socket enable
	* @return {void}
	*/
	enable() {
		this.io.on( 'connection', async socket => {
			await this.initClients();

			const userId = socket.handshake.query[ 'user_id' ];

			if ( !socketClients[ userId ] ) {
				socketClients[ userId ] = [];
			}

			// Store socket id
			let index = _.indexOf( socketClients[ userId ], socket.id );
			index < 0 && socketClients[ userId ].push( socket.id );

			socket.on( 'disconnect', async () => {
				await this.initClients();

				if ( !socketClients[ userId ] ) return;

				// Destroy socket
				index = _.indexOf( socketClients[ userId ], socket.id );
				index > -1 && socketClients[ userId ].splice( index, 1 );

				this.updateClients();
			} );

			this.updateClients();
		} );
	}

	/**
	* Socket emit event
	* @param {any} event - Socket event
	* @param {any} data - Socket data
	* @param {array} userIds - Array of user id to send socket data
	* @return {void}
	*/
	async emit( event, data, userIds = null ) {
		await this.initClients();

		_.each( userIds, userId => {
			_.each( socketClients[ userId ], socketId => {
				this.io.sockets.to( socketId ).emit( event, data );
			} );
		} );
	}

	/**
	* Socket boardcast event
	* @param {any} event - Socket event
	* @param {any} data - Socket data
	* @return {void}
	*/
	async boardcast( event, data ) {
		await this.initClients();

		_.each( socketClients, socketId => {
			this.io.sockets.to( socketId ).emit( event, data );
		} );
	}

	/**
	* Socket event listener
	* @param {any} event
	* @param {function} callBack
	* @return {void}
	*/
	on( event, callBack ) {
		this.io.sockets.on( event, data => {
			_.isFunction( callBack ) && callBack( data );
		} );
	}

	/**
	* Socket event listener
	* @param {int} userId
	* @return {void}
	*/
	async disconnect( userId ) {
		await this.initClients();
		delete socketClients[ userId ];
		this.updateClients();
	}

}

module.exports = WebSocket;
