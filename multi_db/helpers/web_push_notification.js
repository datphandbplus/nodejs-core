const _ = require( 'underscore' );

const WebPushNotificationBase = require( '../../helpers/web_push_notification' );

/* eslint-disable-next-line */
let fcmSubscriptions = {};

class WebPushNotification extends WebPushNotificationBase {

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
	* Enable user subscription
	* @param {int} userId
	* @param {any} subscription
	* @return {void}
	*/
	async enable( userId, subscription ) {
		await this.initSubscriptions();

		if ( !fcmSubscriptions[ this.channelId ] ) {
			fcmSubscriptions[ this.channelId ] = {};
		}

		if ( !fcmSubscriptions[ this.channelId ][ userId ] ) {
			fcmSubscriptions[ this.channelId ][ userId ] = [];
		}

		fcmSubscriptions[ this.channelId ][ userId ].push( subscription );
		this.updateSubscriptions();
	}

	/**
	* Disable channel/user subscription
	* @param {int} userId
	* @return {void}
	*/
	async disabled( userId = null ) {
		await this.initSubscriptions();

		if ( !fcmSubscriptions[ this.channelId ] ) return;

		userId
			? delete fcmSubscriptions[ this.channelId ][ userId ]
			: delete fcmSubscriptions[ this.channelId ];

		this.updateSubscriptions();
	}

	/**
	* Send notification
	* @param {array} userIds - Array of user id to send notification
	* @param {any} payload - Notification payload
	* @return {void}
	*/
	async send( userIds, payload ) {
		await this.initSubscriptions();

		_.each( userIds, userId => {
			if ( !fcmSubscriptions[ this.channelId ] ) return;

			_.each( fcmSubscriptions[ this.channelId ][ userId ], ( subscription, index ) => {
				this.webpush.sendNotification(
					subscription,
					JSON.stringify( payload )
				)
				.then()
				.catch( () => this._deleteUnusedSubscription( userId, index ) );
			} );
		} );
	}

	/**
	* Broadcast notification
	* @param {any} payload - Notification payload
	* @return {void}
	*/
	async broadcast( payload ) {
		await this.initSubscriptions();

		_.each( fcmSubscriptions[ this.channelId ], ( fcmSubscription, userId ) => {
			_.each( fcmSubscription, ( subscription, index ) => {
				this.webpush.sendNotification(
					subscription,
					JSON.stringify( payload )
				)
				.then()
				.catch( () => this._deleteUnusedSubscription( userId, index ) );
			} );
		} );
	}

	/**
	* Delete unused subscription
	* @private
	* @param {int} userId
	* @param {int} deleteIndex
	* @return {void}
	*/
	async _deleteUnusedSubscription( userId, deleteIndex ) {
		await this.initSubscriptions();

		if ( !fcmSubscriptions[ this.channelId ]
			|| !fcmSubscriptions[ this.channelId ][ userId ] ) {
			return;
		}

		fcmSubscriptions[ this.channelId ][ userId ].splice( deleteIndex, 1 );
		this.updateSubscriptions();
	}

}

module.exports = WebPushNotification;
