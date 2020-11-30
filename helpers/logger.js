const Log = require( 'log' );
const fs = require( 'fs' );
const moment = require( 'moment-timezone' );
const _ = require( 'underscore' );
const targz = require( 'targz' );
const express = require( 'express' );
const rimraf = require( 'rimraf' );
const path = require( 'path' );

const Factory = require( './factory' );
const Mailer = require( './mailer' );

const app = express();
const APP_DIR = process.cwd();

let LoggerInstance = null;
let LoggerCron = null;
let LoggerQueue = [];
let CONFIG = {
	SERVER: Factory.getConfig( 'server' ) || {},
};

class Logger {

	/**
	* @constructor
	*/
	constructor() {
		const currentDate = moment();

		if ( LoggerInstance
			&& LoggerInstance.date
			&& currentDate.isSame( LoggerInstance.date ) ) {
			return;
		}

		let env = null;
		let options = null;
		let pathStr = path.join( APP_DIR, '/logs/' );

		if ( app.get( 'env' ) === 'development' ) {
			env = 'dev';
			options = { flags: 'w' }; // Overwrite
		} else if ( app.get( 'env' ) === 'staging' ) {
			env = 'staging';
			options = { flags: 'a' }; // Not overwrite
		} else if ( app.get( 'env' ) === 'production' ) {
			env = 'prod';
			options = { flags: 'a' }; // Not overwrite
		}

		pathStr += env + '_' + currentDate.format( 'YYYYMMDD' );

		// Create current log folder
		!fs.existsSync( pathStr ) && fs.mkdirSync( pathStr, '0700' );

		// Declare log instances
		LoggerInstance = {
			date: currentDate,
			// Declare debug log
			debug: new Log(
				'debug',
				fs.createWriteStream( pathStr + '/debug.log', options )
			),
			// Declare access log
			access: new Log(
				'debug',
				fs.createWriteStream( pathStr + '/access.log', options )
			),
		};
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
	* Backup log folders over 10 days
	* @static
	* @param {int} overDays - Number of over days to backup
	* @return {void}
	*/
	static backupLogFolders( overDays = 5 ) {
		let env;

		const pathStr = path.join( APP_DIR, '/logs/' );

		if ( app.get( 'env' ) === 'development' ) {
			env = 'dev';
		} else if ( app.get( 'env' ) === 'staging' ) {
			env = 'staging';
		} else if ( app.get( 'env' ) === 'production' ) {
			env = 'prod';
		}

		const currentDate = moment();

		fs.readdir( pathStr, ( err, files ) => {
			const regex = new RegExp( '^' + env + '_[0-9]+' );
			const backupPath = pathStr + 'backup/';

			// Create backup log folders
			files && files.length && !fs.existsSync( backupPath ) && fs.mkdirSync( backupPath, '0700' );

			_.each( files, folder => {
				if ( !regex.test( folder ) ) return;

				const logDate = folder.split( '_' )[ 1 ];

				if ( currentDate.diff( moment( logDate ), 'days' ) < overDays ) return;

				targz.compress(
					{
						src	: pathStr + folder,
						dest: backupPath + folder + '.taz.gz',
					},
					error => {
						if ( error ) return;

						// Remove backup log folder
						rimraf( pathStr + folder, () => {} );
					}
				);
			} );
		} );
	}

	/**
	* Write debug log
	* @param {string} logName - Log type
	* @param {string} logMsg - Log message
	* @param {boolean} isSendErrorTrackingEmail - Send error tracking email
	* @return {void}
	*/
	write( logName, logMsg, isSendErrorTrackingEmail = true ) {
		logMsg = '\n============ MESSAGE ============\n'
			+ JSON.stringify( logMsg )
			+ '\n============ TRACE ==============\n'
			+ this._getStackTrace()
			+ '\n';

		LoggerInstance.debug[ logName ]( logMsg );

		if ( !isSendErrorTrackingEmail || !CONFIG.SERVER.SUPPORT_EMAIL ) {
			return;
		}

		LoggerQueue.push( logMsg );

		if ( LoggerCron ) return;

		LoggerCron = setTimeout( () => this._sendErrorTrackingEmail(), CONFIG.SERVER.ERROR_TRACKING_TIMEOUT || 3600000 );
	}

	/**
	* Write access log
	* @param {any} tokens
	* @param {any} req - Http request
	* @param {any} res - Http response
	* @param {string} logMsg - Log message
	* @return {void}
	*/
	writeAccess(
		tokens, req,
		res, logMsg = null
	) {
		if ( !logMsg ) {
			logMsg = '\n============ REQUEST ===========\n'
				+ [
					req.method,
					req.originalUrl,
					tokens.status( req, res ),
					tokens[ 'response-time' ]( req, res ) + ' ms',
				].join( ' ' )
				+ '\n============ HEADER ============\n'
				+ 'Origin: ' + req.header( 'origin' )
				+ '\n'
				+ 'User-Agent: ' + req.header( 'user-agent' )
				+ '\n'
				+ (
					req.header( 'x-user-id' )
						? '\n' + 'x-user-id: ' + req.header( 'x-user-id' )
						: ''
				)
				+ '\n============ BODY ==============\n'
				+ JSON.stringify( req.body )
				+ '\n';
		}

		LoggerInstance.access.info( logMsg );
	}

	/**
	* Get stack tracing for error
	* @private
	* @return {string} Stack trace
	*/
	_getStackTrace() {
		const obj = {};
		Error.captureStackTrace( obj, this._getStackTrace );
		return obj.stack.replace( /^Error/g, '' ).replace( /    /g, '' ).trim();
	}

	/**
	* Send error tracking email
	* @private
	* @return {void}
	*/
	_sendErrorTrackingEmail() {
		if ( !LoggerQueue || !LoggerQueue.length ) return;

		let env;

		if ( app.get( 'env' ) === 'development' ) {
			env = 'Development';
		} else if ( app.get( 'env' ) === 'staging' ) {
			env = 'Staging';
		} else if ( app.get( 'env' ) === 'production' ) {
			env = 'Production';
		}

		new Mailer().send({
			to		: CONFIG.SERVER.SUPPORT_EMAIL,
			subject	: '[ERROR LOG] ' + env,
			text	: LoggerQueue.join( '\n' ),
		});

		LoggerQueue = [];
		LoggerCron = null;
	}

}

module.exports = Logger;
