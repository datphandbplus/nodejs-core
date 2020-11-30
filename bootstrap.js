const morgan = require( 'morgan' );
const express = require( 'express' );
const fs = require( 'fs' );
const mime = require( 'mime' );

const Logger = require( './helpers/logger' );
const ApiCache = require( './helpers/api_cache' );
const Factory = require( './helpers/factory' );
const TokenGenerator = require( './helpers/token_generator' );

const STATUS_CODE = Factory.getResource( 'http_status_code' );
const STATUS_MESSAGE = Factory.getResource( 'http_status_message' );
const app = express();

module.exports = {
	morganFormat( tokens, req, res ) {
		// Write access logs
		req.method !== 'GET' && new Logger().writeAccess( tokens, req, res );

		// Get the status code if response written
		const status = res._header ? res.statusCode : undefined;

		// Get status color
		const color = status >= 500 ? 31 // red
			: status >= 400 ? 33 // yellow
				: status >= 300 ? 36 // cyan
					: status >= 200 ? 32 // green
						: 0; // no color

		const fn = morgan.compile( '\x1b[0m:method :url \x1b['
			+ color + 'm:status \x1b[0m:response-time ms' );

		return fn( tokens, req, res );
	},
	assetsRouting( req, res, next ) {
		const token = req.query.token;
		const decrypt = TokenGenerator.decrypt( token );
		const filePath = decrypt ? decrypt.file_path : null;

		if ( !filePath ) {
			res.status( STATUS_CODE.NOT_FOUND );
			res.json( STATUS_MESSAGE.NOT_FOUND );
			return;
		}

		const stat = fs.statSync( filePath );
		const type = mime.getType( filePath );

		res.writeHead( 200, { 'Content-Type': type, 'Content-Length': stat.size } );
		fs.createReadStream( filePath ).pipe( res );
	},
	catch404Error( req, res, next ) {
		const error = new Error( STATUS_MESSAGE.NOT_FOUND );
		error.status = STATUS_CODE.NOT_FOUND;
		next( error );
	},
	catchServerError( error, req, res, next ) {
		let status = STATUS_CODE.SERVER_ERROR;
		let message = STATUS_MESSAGE.SERVER_ERROR;

		// In case error is message
		if ( !error.status || !error.message ) {
			message = error;
		}

		// In case error is json
		status = error.status ? error.status : status;
		message = error.message ? error.message : message;

		// Only show server error in dev enviroment
		if ( app.get( 'env' ) !== 'development'
			&& status === STATUS_CODE.SERVER_ERROR ) {
			message = STATUS_MESSAGE.SERVER_ERROR;
		}

		// Destroy cache
		ApiCache.destroy( res );

		res.status( status );
		res.json( { status, error: message } );
	},
};
