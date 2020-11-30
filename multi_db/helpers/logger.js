const LoggerBase = require( '../../helpers/logger' );

class Logger extends LoggerBase {

	/**
	* @constructor
	*/
	constructor() {
		super();
	}

	/**
	* Write debug log
	* @param {string} logName - Log type
	* @param {string} logMsg - Log message
	* @param {string} channelName
	* @param {boolean} isSendErrorTrackingEmail - Send error tracking email
	* @return {void}
	*/
	write(
		logName, logMsg,
		channelName = 'System', isSendErrorTrackingEmail = true
	) {
		logMsg = 'Channel: '
			+ channelName
			+ '\n'
			+ logMsg;
		return super.write( logName, logMsg, isSendErrorTrackingEmail );
	}

	/**
	* Write access log
	* @param {any} tokens
	* @param {any} req - Http request
	* @param {any} res - Http response
	* @return {void}
	*/
	writeAccess( tokens, req, res ) {
		const logMsg = '\n============ REQUEST ===========\n'
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
			+ 'x-channel-id: ' + req.header( 'x-channel-id' )
			+ (
				req.header( 'x-user-id' )
					? '\n' + 'x-user-id: ' + req.header( 'x-user-id' )
					: ''
			)
			+ '\n============ BODY ==============\n'
			+ JSON.stringify( req.body )
			+ '\n';

		super.writeAccess( tokens, req, res, logMsg );
	}

}

module.exports = Logger;
