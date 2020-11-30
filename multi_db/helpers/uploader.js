const UploaderBase = require( '../../helpers/uploader' );

class Uploader extends UploaderBase {

	/**
	* @constructor
	* @param {string} channelId
	* @param {object} config
	*/
	constructor( channelId, config = {} ) {
		super( config );
		this.channelId = channelId;
	}

	/**
	* Upload to local
	* @param {any} request - Http request to support upload to local
	* @param {any} response - Http response to support upload to local
	* @param {string} storePath - Path to store file
	* @param {boolean} isPublic - Is public file
	* @return {promise}
	*/
	uploadToLocal( request, response, storePath = 'temp', isPublic = true ) {
		return super.uploadToLocal( request, response, 'channel_' + this.channelId + '/' + storePath, isPublic );
	}

	/**
	* Upload direct to remote
	* @param {any} request - Http request to support upload AWS S3
	* @param {any} response - Http response to support upload AWS S3
	* @param {string} storePath - Path to store file
	* @param {boolean} isPublic - Is public file
	* @return {promise}
	*/
	uploadToRemote( request, response, storePath = 'temp', isPublic = true ) {
		return super.uploadToRemote( request, response, 'channel_' + this.channelId + '/' + storePath, isPublic );
	}

	/**
	* Upload direct to S3
	* @param {any} request - Http request to support upload AWS S3
	* @param {any} response - Http response to support upload AWS S3
	* @param {string} storePath - Path to store file
	* @param {boolean} isPublic - Is public file
	* @return {promise}
	*/
	uploadToS3( request, response, storePath = 'temp', isPublic = true ) {
		return super.uploadToS3( request, response, 'channel_' + this.channelId + '/' + storePath, isPublic );
	}

	/**
	* Move file to S3
	* @param {array} filePaths - files path move to S3
	* @param {string} storePath - Path to store file
	* @return {promise}
	*/
	moveToS3( filePaths, storePath = 'temp' ) {
		return super.moveToS3( filePaths, 'channel_' + this.channelId + '/' + storePath );
	}

}

module.exports = Uploader;
