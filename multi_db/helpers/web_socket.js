const _ = require( 'underscore' );

const WebSocketBase = require( '../../helpers/web_socket' );

/* eslint-disable-next-line */
let socketClients = {};

class WebSocket extends WebSocketBase {

	/**
	* @constructor
	* @param {string} channelId
	* @param {object} config
	*/
	constructor( channelId, config = null ) {
		super( config );
		this.channelId = channelId;
	}

	/**
	* Socket enable
	* @return {void}
	*/
	enable() {
		this.io.on( 'connection', async socket => {
			await this.initClients();

			const channelId = socket.handshake.query[ 'channel_id' ];
			const userId = socket.handshake.query[ 'user_id' ];

			if ( !socketClients[ channelId ] ) {
				socketClients[ channelId ] = {};
			}

			if ( !socketClients[ channelId ][ userId ] ) {
				socketClients[ channelId ][ userId ] = [];
			}

			// Store socket id
			let index = _.indexOf( socketClients[ channelId ][ userId ], socket.id );
			index < 0 && socketClients[ channelId ][ userId ].push( socket.id );

			socket.on( 'disconnect', async () => {
				await this.initClients();

				if ( !socketClients[ channelId ][ userId ] ) return;

				// Destroy socket
				index = _.indexOf( socketClients[ channelId ][ userId ], socket.id );
				index > -1 && socketClients[ channelId ][ userId ].splice( index, 1 );

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
			_.each( socketClients[ this.channelId ][ userId ], socketId => {
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

		_.each( socketClients[ this.channelId ], socketClient => {
			_.each( socketClient, socketId => {
				this.io.sockets.to( socketId ).emit( event, data );
			} );
		} );
	}

	/**
	* Socket event listener
	* @param {int} userId
	* @return {void}
	*/
	async disconnect( userId = null ) {
		await this.initClients();

		userId
			? delete socketClients[ this.channelId ][ userId ]
			: delete socketClients[ this.channelId ];

		this.updateClients();
	}

}

module.exports = WebSocket;
