const express = require( 'express' );
const fs = require( 'fs' );
const moment = require( 'moment-timezone' );
const path = require( 'path' );

const app = express();
const APP_DIR = process.cwd();

class Factory {

	/**
	* Get config
	* @static
	* @param {string} configName - Config name to get
	* @param {boolean} isNotEnv - Flag to get config not in enviroment
	* @return {any}
	*/
	static getConfig( configName, isNotEnv = false ) {
		try {
			let env;

			if ( app.get( 'env' ) === 'development' ) {
				env = 'dev';
			} else if ( app.get( 'env' ) === 'staging' ) {
				env = 'staging';
			} else if ( app.get( 'env' ) === 'production' ) {
				env = 'prod';
			}

			env += '/';

			if ( isNotEnv ) env = '';

			/* eslint-disable-next-line */
			return require( path.join( APP_DIR, '/config', env + configName ) );
		} catch {
			return null;
		}
	}

	/**
	* Get resource
	* @static
	* @param {string} resourceName - Resource name to get
	* @return {any}
	*/
	static getResource( resourceName ) {
		try {
			/* eslint-disable-next-line */
			return require( path.join( APP_DIR, '/resources', resourceName ) );
		} catch ( error ) {
			return null;
		}
	}

	/**
	* Get public upload folder
	* @static
	* @param {string} dir
	* @param {string} pathStr
	* @return {string} Public upload path
	*/
	static getUploadDir( dir, pathStr = null ) {
		if ( !fs.existsSync( dir ) ) fs.mkdirSync( dir, { recursive: true } );

		if ( pathStr ) {
			dir = path.join( dir, pathStr );

			if ( !fs.existsSync( dir ) ) fs.mkdirSync( dir, { recursive: true } );
		}

		return dir;
	}

	/**
	* Create temp file name
	* @static
	* @return {string} Temp file name
	*/
	static getTempName() {
		return ( +moment() ).toString();
	}

}

module.exports = Factory;
