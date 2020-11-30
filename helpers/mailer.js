const nodemailer = require( 'nodemailer' );
const Q = require( 'q' );

const Factory = require( './factory' );

let CONFIG = {
	MAILER: Factory.getConfig( 'mailer' ) || {},
};

class Mailer {

	/**
	* @constructor
	* @param {object} config
	*/
	constructor( config = null ) {
		this.transporter = nodemailer.createTransport({
			host	: CONFIG.MAILER.HOST,
			port	: CONFIG.MAILER.PORT,
			secure	: CONFIG.MAILER.SECURE,
			tls		: CONFIG.MAILER.TLS,
			auth: {
				user: CONFIG.MAILER.AUTH.USER,
				pass: CONFIG.MAILER.AUTH.PASS,
			},
			...config,
		});
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
	* Send email
	* @param {object} mailOptions - Mail options to send
	* @return {promise}
	*/
	send( mailOptions ) {
		const deferred = Q.defer();

		if ( !mailOptions.from ) {
			mailOptions.from = CONFIG.MAILER.DEFAULT.FROM;
		}

		this.transporter.sendMail( mailOptions, ( error, info ) => {
			if ( error ) {
				deferred.reject( error );
				return;
			}

			deferred.resolve( 'Message ' + info.messageId + ' sent: ' + info.response );
		} );

		return deferred.promise;
	}

}

module.exports = Mailer;
