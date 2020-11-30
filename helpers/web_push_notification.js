const _ = require( 'underscore' );
const webpush = require( 'web-push' );
const redis = require( 'redis' );
const bluebird = require( 'bluebird' );

const Factory = require( './factory' );

let CONFIG = {
	SERVER	: Factory.getConfig( 'server' ) || {},
	FCM		: Factory.getConfig( 'fcm' ) || {},
};

let fcmSubscriptions = {};

bluebird.promisifyAll( redis );

class WebPushNotification {

	/**
	* @constructor
	* @param {object} config
	*/
	constructor( config = null ) {
		this.webpush = webpush;
		this.webpush.setVapidDetails(
			CONFIG.FCM.SUBJECT || config.subject,
			CONFIG.FCM.PUBLIC_KEY || config.public_key,
			CONFIG.FCM.PRIVATE_KEY || config.private_key
		);

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
	* Init subscriptions
	* @return {void}
	*/
	async initSubscriptions() {
		if ( CONFIG.SERVER.DEFAULT_CACHE !== 'redis' ) return;

		fcmSubscriptions = await this.redisClient.getAsync( 'fcmSubscriptions' );
		fcmSubscriptions = JSON.parse( fcmSubscriptions || '{}' );
	}

	/**
	* Update subscriptions
	* @return {void}
	*/
	updateSubscriptions() {
		if ( CONFIG.SERVER.DEFAULT_CACHE !== 'redis' ) return;

		this.redisClient.set( 'fcmSubscriptions', JSON.stringify( fcmSubscriptions || {} ) );
	}

	/**
	* Enable user subscription
	* @param {int} userId
	* @param {any} subscription
	* @return {void}
	*/
	async enable( userId, subscription ) {
		await this.initSubscriptions();

		if ( !fcmSubscriptions[ userId ] ) {
			fcmSubscriptions[ userId ] = [];
		}

		fcmSubscriptions[ userId ].push( subscription );
		this.updateSubscriptions();
	}

	/**
	* Disable user subscription
	* @param {int} userId
	* @return {void}
	*/
	async disabled( userId ) {
		await this.initSubscriptions();
		delete fcmSubscriptions[ userId ];
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
			if ( !fcmSubscriptions[ userId ] ) return;

			_.each( fcmSubscriptions[ userId ], ( subscription, index ) => {
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

		_.each( fcmSubscriptions, ( fcmSubscription, userId ) => {
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

		if ( !fcmSubscriptions[ userId ] ) return;

		fcmSubscriptions[ userId ].splice( deleteIndex, 1 );
		this.updateSubscriptions();
	}

}

module.exports = WebPushNotification;
