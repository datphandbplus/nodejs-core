const CryptoJS = require( 'crypto-js' );
const Q = require( 'q' );

const Logger = require( './logger' );
const ApiCache = require( './api_cache' );
const Factory = require( '../../helpers/factory' );
const TokenGenerator = require( '../../helpers/token_generator' );
const Channel = require( '../models/channel/channel' );
const ChannelAccount = require( '../models/channel/channel_account' );
const ChannelApp = require( '../models/channel/channel_app' );

const STATUS_CODE = Factory.getResource( 'http_status_code' );

let CONFIG = {
	DB: Factory.getConfig( 'db' ) || {},
};

class Authentication {

	/**
	* @constructor
	* @param {string} channelId
	*/
	constructor( channelId ) {
		this.channelId = channelId;
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
	* Login
	* @param {string} channelToken
	* @param {object} accountData - Account authentication data
	* @return {promise}
	*/
	async login( channelToken, accountData ) {
		const deferred = Q.defer();

		try {
			accountData.password = CryptoJS.SHA256(
				TokenGenerator.passwordDecrypt( accountData.password )
			)
			.toString();

			// Login by account
			const account = await ChannelAccount.findOne({
				attributes: [ 'id', 'username' ],
				where: {
					channel_id	: this.channelId,
					username	: accountData.username,
					password	: accountData.password,
				},
			});

			if ( !account ) {
				deferred.resolve({
					status	: false,
					message	: 'USER_LOGIN_FAIL',
				});
				return deferred.promise;
			}

			// Update account token
			const token = TokenGenerator.encrypt({
				channel_id		: this.channelId,
				channel_token	: channelToken,
				account_id		: account.id,
				account_username: account.username,
			});

			deferred.resolve({
				status: true,
				data: {
					channel_id		: this.channelId,
					channel_token	: channelToken,
					account_id		: account.id,
					account_token	: token,
				},
			});
		} catch ( error ) {
			new Logger().write( 'error', error, this.channelId );
			deferred.reject( error );
		}

		return deferred.promise;
	}

	/**
	* Change password
	* @param {string} username
	* @param {string} currentPassword
	* @param {string} newPassword
	* @return {promise}
	*/
	async changePassword( username, currentPassword, newPassword ) {
		const deferred = Q.defer();

		try {
			const available = await this.checkAccountAvailable( username );

			if ( !available || !available.status ) {
				deferred.resolve({
					status	: false,
					message	: 'ACCOUNT_NOT_AVAILABLE',
				});
				return deferred.promise;
			}

			currentPassword = CryptoJS
			.SHA256( TokenGenerator.passwordDecrypt( currentPassword ) )
			.toString();
			newPassword = CryptoJS
			.SHA256( TokenGenerator.passwordDecrypt( newPassword ) )
			.toString();

			const account = await ChannelAccount.findOne({
				attributes: [ 'id' ],
				where: {
					username,
					channel_id	: this.channelId,
					password	: currentPassword,
				},
			});

			if ( !account ) {
				deferred.resolve({
					status	: false,
					message	: 'CURRENT_PASSWORD_INVALID',
				});
				return deferred.promise;
			}

			// Sync account
			const result = await this.syncAccount( username, newPassword );

			if ( !result.status ) {
				deferred.resolve({
					status	: false,
					message	: 'CHANGE_PASSWORD_FAIL',
				});
				return deferred.promise;
			}

			deferred.resolve({
				status	: true,
				message	: 'CHANGE_PASSWORD_SUCCESS',
			});
		} catch ( error ) {
			new Logger().write( 'error', error, this.channelId );
			deferred.reject( error );
		}

		return deferred.promise;
	}

	/**
	* Check channel token
	* @param {string} channelToken - Channel token to check
	* @return {promise}
	*/
	async checkChannelToken( channelToken ) {
		const deferred = Q.defer();

		try {
			const decoded = TokenGenerator.decrypt( channelToken );

			if ( !decoded || decoded.channel_id !== this.channelId ) {
				deferred.reject({
					status	: STATUS_CODE.UNAUTHORIZED,
					message	: 'CHANNEL_TOKEN_EXPIRED',
				});
				return deferred.promise;
			}

			const key = ApiCache.createKey( [ 'CHANNEL', this.channelId ] );

			if ( ApiCache.has( key ) ) {
				deferred.resolve( ApiCache.get( key ) );
				return deferred.promise;
			}

			const channel = await this.getChannel();

			if ( !channel ) {
				deferred.reject({
					status	: STATUS_CODE.NOT_FOUND,
					message	: 'CHANNEL_NOT_FOUND',
				});
				return deferred.promise;
			}

			const appAvailable = await this.checkAppAvailable();

			if ( !appAvailable ) {
				deferred.reject({
					status	: STATUS_CODE.NOT_FOUND,
					message	: 'APP_UNAVAILABLE',
				});
				return deferred.promise;
			}

			ApiCache.set( key, channel );
			deferred.resolve( channel );
		} catch ( error ) {
			new Logger().write( 'error', error, this.channelId );
			deferred.reject( error );
		}

		return deferred.promise;
	}

	/**
	* Check account token
	* @param {string} channelToken - Channel token to check
	* @param {int} accountId - Account id to check
	* @param {string} accountToken - Account token to check
	* @return {promise}
	*/
	async checkAccountToken( channelToken, accountId, accountToken ) {
		const deferred = Q.defer();

		try {
			const decoded = TokenGenerator.decrypt( accountToken );

			if ( !decoded
				|| decoded.channel_id !== this.channelId
				|| decoded.channel_token !== channelToken
				|| +decoded.account_id !== +accountId ) {
				deferred.reject({
					status	: STATUS_CODE.UNAUTHORIZED,
					message	: 'ACCOUNT_TOKEN_EXPIRED',
				});
				return deferred.promise;
			}

			const key = ApiCache.createKey( [ 'CHANNEL', this.channelId, accountId ] );

			if ( ApiCache.has( key ) ) {
				deferred.resolve( ApiCache.get( key ) );
				return deferred.promise;
			}

			const available = await this.checkAccountAvailable( decoded.account_username );

			if ( !available || !available.status ) {
				deferred.reject({
					status	: STATUS_CODE.NOT_FOUND,
					message	: 'ACCOUNT_NOT_AVAILABLE',
				});
				return deferred.promise;
			}

			const user = await this.getUser( decoded.account_username );

			if ( !user ) {
				deferred.reject({
					status	: STATUS_CODE.NOT_FOUND,
					message	: 'ACCOUNT_NOT_FOUND',
				});
				return deferred.promise;
			}

			ApiCache.set( key, user );
			deferred.resolve( user );
		} catch ( error ) {
			new Logger().write( 'error', error, this.channelId );
			deferred.reject( error );
		}

		return deferred.promise;
	}

	/**
	* Sync account
	* @param {string} username
	* @param {string} password
	* @return {void}
	*/
	async syncAccount( username, password ) {
		const deferred = Q.defer();

		try {
			let [ account, created ] = await ChannelAccount.findOrCreate({
				defaults: { username, password },
				where	: { username, channel_id: this.channelId },
			});

			if ( !created ) {
				account = await account.update( { password } );
			}

			if ( !account ) {
				deferred.resolve({
					status	: false,
					message	: 'SET_ACCOUNT_FAIL',
				});
				return deferred.promise;
			}

			deferred.resolve({
				status	: true,
				message	: 'SET_ACCOUNT_SUCCESS',
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error, this.channelId );
		}

		return deferred.promise;
	}

	/**
	* Check account available
	* @param {string} username
	* @return {promise}
	*/
	async checkAccountAvailable( username ) {
		const deferred = Q.defer();

		try {
			const account = await ChannelAccount.findOne({
				attributes	: [ 'id' ],
				where		: { username, channel_id: this.channelId },
			});

			// In case account is not available
			if ( !account ) {
				deferred.resolve({
					status	: false,
					message	: 'ACCOUNT_NOT_FOUND',
				});
				return deferred.promise;
			}

			deferred.resolve({
				status	: true,
				message	: 'ACCOUNT_AVAILABLE',
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error, this.channelId );
		}

		return deferred.promise;
	}

	/**
	* Check app available
	* @param {string} appName
	* @return {promise}
	*/
	async checkAppAvailable( appName = CONFIG.DB.DATABASE_APP ) {
		const deferred = Q.defer();

		if ( !appName ) {
			deferred.resolve( true );
			return deferred.promise;
		}

		try {
			const channelApp = await ChannelApp.findOne({
				where: {
					channel_id	: this.channelId,
					name		: appName,
					status		: true,
				},
			});

			deferred.resolve( !!channelApp );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error, this.channelId );
		}

		return deferred.promise;
	}

	/**
	* Get channel
	* @return {promise}
	*/
	getChannel() {
		return Channel.findOne({
			where: { id: this.channelId },
			include: {
				model: ChannelApp,
				where: { status: true },
			},
		});
	}

	/**
	* Get user link with account
	* @abstract
	* @param {string} username
	* @return {promise}
	*/
	getUser( username ) {}

}

module.exports = Authentication;
