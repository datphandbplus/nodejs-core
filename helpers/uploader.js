const Q = require( 'q' );
const _ = require( 'underscore' );
const fs = require( 'fs' );
const multer = require( 'multer' );
const aws = require( 'aws-sdk' );
const multerS3 = require( 'multer-s3' );
const path = require( 'path' );
const url = require( 'url' );
const moment = require( 'moment-timezone' );
const SftpClient = require( 'ssh2-sftp-client' );
const tmp = require( 'tmp' );

const Logger = require( './logger' );
const Factory = require( './factory' );
const TokenGenerator = require( './token_generator' );

const APP_DIR = process.cwd();
const CONSTANTS = Factory.getResource( 'constants' );

let CONFIG = {
	SERVER	: Factory.getConfig( 'server' ) || {},
	AWS		: Factory.getConfig( 'aws' ) || {},
	SFTP	: Factory.getConfig( 'sftp' ) || {},
};

tmp.setGracefulCleanup();

class SFTPStorage {

	/**
	* @constructor
	* @param {object} options
	*/
	constructor( options ) {
		switch ( typeof options.sftp ) {
			case 'object':
				this.sftp = options.sftp;
				break;
			case 'undefined':
				throw new Error( 'options.sftp is required' );
			default:
				throw new TypeError( 'Expected options.sftp to be object' );
		}

		switch ( typeof options.destination ) {
			case 'function':
				this.getDestination = options.destination;
				break;
			case 'string':
				this.getDestination = ( $0, $1, cb ) => cb( null, options.destination );
				break;
			case 'undefined':
				throw new Error( 'options.destination is required' );
			default:
				throw new TypeError( 'Expected options.destination to be function or string' );
		}

		switch ( typeof options.filename ) {
			case 'function':
				this.getFilename = options.filename;
				break;
			case 'undefined':
				this.getFilename = Factory.getTempName();
				break;
			default:
				throw new TypeError( 'Expected options.filename to be undefined or function' );
		}

		this.sftpClient = new SftpClient();
	}

	/**
	* @override
	* @private
	* @param {any} req
	* @param {any} file
	* @param {Function} cb
	*/
	_handleFile( req, file, cb ) {
		this.getDestination( req, file, ( err, destination ) => {
			if ( err ) return cb( err );

			this.getFilename( req, file, ( _err, filename ) => {
				if ( _err ) return cb( _err );

				const finalPath = path.join( destination, filename );

				this.sftpClient.connect( this.sftp )
				.then( async () => {
					const exists = await this.sftpClient.exists( destination );
					return exists ? exists : this.sftpClient.mkdir( destination );
				} )
				.then( () => this.sftpClient.put( file.stream, finalPath ) )
				.then( () => this.sftpClient.end() )
				.then( data => cb( null, { destination, filename, path: finalPath } ) )
				.catch( __err => cb( __err ) );
			} );
		} );
	}

	/**
	* @override
	* @private
	* @param {any} req
	* @param {any} file
	* @param {Function} cb
	*/
	_removeFile( req, file, cb ) {
		this.sftpClient.connect( this.sftp )
		.then( () => this.sftpClient.delete( file.path ) )
		.then( () => this.sftpClient.end() )
		.then( () => cb( null ) )
		.catch( err => cb( err ) );
	}

}

class Uploader {

	/**
	* @constructor
	* @param {object} config
	*/
	constructor( config = {} ) {
		if ( !_.isEmpty( CONFIG.AWS ) ) {
			aws.config.update({
				accessKeyId		: CONFIG.AWS.ACCESS_KEY_ID,
				secretAccessKey	: CONFIG.AWS.SECRET_ACCESS_KEY,
				...config,
			});

			this.s3 = new aws.S3();
			this.s3Bucket = CONFIG.AWS.S3_BUCKET || config.s3_bucket;
		}

		if ( !_.isEmpty( CONFIG.SFTP ) ) {
			this.sftpClient = new SftpClient();
			this.sftp = {
				host		: CONFIG.SFTP.HOST,
				port		: CONFIG.SFTP.PORT,
				username	: CONFIG.SFTP.USERNAME,
				password	: CONFIG.SFTP.PASSWORD,
				privateKey	: fs.readFileSync( path.join( APP_DIR, CONFIG.SFTP.PRIVATE_KEY ) ),
				...config,
			};
		}

		this.defaultOptions = {
			fileFilter: ( _request, file, cb ) => {
				const fileExtension = this._getFileExtension( file );

				if ( !_.contains(
					_.union( CONSTANTS.ALLOW_IMAGE_FILES, CONSTANTS.ALLOW_DOCUMENT_FILES ),
					fileExtension.toLowerCase()
				) ) {
					cb( null, false );
					return;
				}

				cb( null, true );
			},
			limits: { fileSize: CONSTANTS.ALLOW_FILE_SIZE, files: CONSTANTS.ALLOW_MAXIMUM_FILES },
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
	* Convert URL to pathname
	* @static
	* @param {string} urlStr
	* @return {string}
	*/
	static convertURLToPath( urlStr ) {
		if ( !urlStr ) return urlStr;

		const urlData = url.parse( urlStr );
		const serverURLData = url.parse( CONFIG.SERVER.URL );
		const serverSourceRegex = new RegExp( '^(public\/|\/public\/)', 'i' );
		const urlHost = urlData.host;
		const urlPathname = urlData.pathname;

		if ( urlHost
			&& urlPathname
			&& serverURLData
			&& urlHost === serverURLData.host
			&& serverSourceRegex.test( urlPathname ) ) {
			return urlPathname;
		}

		if ( urlData.protocol ) return urlStr;

		if ( serverSourceRegex.test( urlStr ) ) return urlStr;

		return urlPathname ? urlPathname : urlStr;
	}

	/**
	* Convert pathname to full URL
	* @static
	* @param {string} pathStr
	* @return {string}
	*/
	static convertPathToURL( pathStr ) {
		if ( !pathStr ) return pathStr;

		const urlData = url.parse( pathStr );

		if ( urlData.protocol ) return pathStr;

		const clientSourceRegex = new RegExp( '^.\/', 'i' );

		if ( clientSourceRegex.test( pathStr ) ) return pathStr;

		return url.resolve( CONFIG.SERVER.URL, urlData.pathname );
	}

	/**
	* Convert pathname to full assets URL
	* @static
	* @param {string} pathStr
	* @param {int} expiresIn
	* @return {string}
	*/
	static convertPathToAssetsURL( pathStr, expiresIn ) {
		const token = encodeURIComponent(
			TokenGenerator.encrypt( { file_path: pathStr }, expiresIn !== undefined, expiresIn )
		);
		const fileName = path.basename( pathStr );
		return url.resolve( CONFIG.SERVER.URL, `assets/${fileName}?token=${token}` );
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
		const storage = multer.diskStorage({
			destination: path.join(
				isPublic ? 'public' : 'non-public',
				'uploads',
				storePath,
				moment().format( 'YYYY-MM-DD' )
			),
			filename: ( _request, file, cb ) => {
				const fileExtension = this._getFileExtension( file );
				const originalName = file.originalname.replace( '.' + fileExtension, '' );
				cb( null, originalName + '_' + Factory.getTempName() + '.' + fileExtension );
			},
		});
		const upload = multer( { ...this.defaultOptions, storage } ).any();

		return this._upload( upload, request, response, file => {
			file.key = null;
			file.location = file.path;
			return file;
		} );
	}

	/**
	* Upload direct to remote
	* @param {any} request - Http request to support upload to local
	* @param {any} response - Http response to support upload to local
	* @param {string} storePath - Path to store file
	* @param {boolean} isPublic - Is public file
	* @return {promise}
	*/
	uploadToRemote( request, response, storePath = 'temp', isPublic = true ) {
		const storage = new SFTPStorage({
			sftp: this.sftp,
			destination: path.join(
				CONFIG.SFTP.PWD,
				isPublic ? 'public' : 'non-public',
				'uploads',
				storePath,
				moment().format( 'YYYY-MM-DD' )
			),
			filename: ( _request, file, cb ) => {
				const fileExtension = this._getFileExtension( file );
				const originalName = file.originalname.replace( '.' + fileExtension, '' );
				cb( null, originalName + '_' + Factory.getTempName() + '.' + fileExtension );
			},
		});
		const upload = multer( { ...this.defaultOptions, storage } ).any();

		return this._upload( upload, request, response, file => {
			file.key = null;
			file.location = CONFIG.SFTP.STATIC_URL + '/' + file.destination;
			return file;
		} );
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
		const storage = multerS3({
			s3		: this.s3,
			bucket	: this.s3Bucket,
			metadata: ( _request, file, cb ) => {
				cb( null, { fieldName: file.fieldname } );
			},
			key: ( _request, file, cb ) => {
				const fileExtension = this._getFileExtension( file );
				const destination = path.join( isPublic ? 'public' : 'non-public', 'uploads', storePath );
				cb( null, path.join( destination, Factory.getTempName() + '.' + fileExtension ) );
			},
		});
		const upload = multer( { ...this.defaultOptions, storage } ).any();

		return this._upload( upload, request, response, file => {
			file.path = null;
			return file;
		} );
	}

	/**
	* Move file to S3
	* @param {array} filePaths - files path move to S3
	* @param {string} storePath - Path to store file
	* @return {promise}
	*/
	moveToS3( filePaths, storePath = 'temp' ) {
		const files = _.map( filePaths, filePath => {
			return this._moveToS3( Uploader.convertURLToPath( filePath ), storePath );
		} );

		return Q.all( files );
	}

	/**
	* Download file from remote
	* @param {string} filePath - File path to download
	* @param {int} expiresIn - Expire time
	* @return {promise}
	*/
	downloadFromRemote( filePath, expiresIn = '1m' ) {
		const deferred = Q.defer();
		const tmpDir = tmp.dirSync();
		const dist = path.join( tmpDir.name, path.basename( filePath ) );

		this.sftpClient.connect( this.sftp )
		.then( () => this.sftpClient.get( filePath, fs.createWriteStream( dist ) ) )
		.then( () => this.sftpClient.end() )
		.then( () => deferred.resolve( Uploader.convertPathToAssetsURL( dist ) ) )
		.catch( err => deferred.reject( err ) );

		return deferred.promise;
	}

	/**
	* Download file from S3
	* @param {string} key - File key to download
	* @param {int} expiresIn - Expire time
	* @return {promise}
	*/
	downloadFromS3( key, expiresIn = '1m' ) {
		return this.s3.getSignedUrl(
			'getObject',
			{
				Bucket	: CONFIG.AWS.S3_BUCKET,
				Key		: key,
				Expires	: expiresIn,
			}
		);
	}

	/**
	* Default where to upload file
	* @param {any} request - Http request to support upload to local
	* @param {any} response - Http response to support upload to local
	* @param {string} storePath - Path to store file
	* @param {boolean} isPublic - Is public file
	* @return {promise}
	*/
	upload( request, response, storePath = 'temp', isPublic = true ) {
		switch ( CONFIG.SERVER.DEFAULT_UPLOAD ) {
			case 's3':
				return this.uploadToS3( request, response, storePath, isPublic );
				break;
			case 'remote':
				return this.uploadToRemote( request, response, storePath, isPublic );
				break;
			default:
				return this.uploadToLocal( request, response, storePath, isPublic );
		}
	}

	/**
	* Default where to upload file
	* @param {string} data - Data to download
	* @param {int} expiresIn - Expired time
	* @return {any}
	*/
	download( data, expiresIn = '1m' ) {
		switch ( CONFIG.SERVER.DEFAULT_UPLOAD ) {
			case 's3':
				return this.downloadFromS3( data.key, expiresIn );
				break;
			case 'remote':
				return this.downloadFromRemote( data.path, expiresIn );
				break;
			default:
				return Uploader.convertPathToAssetsURL( data.url, expiresIn );
		}
	}

	/**
	* Run upload
	* @private
	* @param {any} upload - Upload function
	* @param {any} request - Http request to support upload to local
	* @param {any} response - Http response to support upload to local
	* @param {Function} callBack - Handle file
	* @return {promise}
	*/
	_upload( upload, request, response, callBack ) {
		const deferred = Q.defer();

		upload( request, response, err => {
			if ( err ) {
				if ( err.code === 'LIMIT_FILE_SIZE' ) {
					deferred.resolve({
						status	: false,
						message	: 'INVALID_FILE_SIZE',
					});
					return;
				}

				if ( err.code === 'LIMIT_FILE_COUNT' ) {
					deferred.resolve({
						status	: false,
						message	: 'INVALID_FILE_COUNT',
					});
					return;
				}

				deferred.resolve({
					status	: false,
					message	: 'UPLOAD_FILE_FAIL',
				});
				return;
			}

			let files = request.files;

			if ( _.isFunction( callBack ) ) files = _.map( files, callBack );

			deferred.resolve({
				status	: true,
				message	: 'UPLOAD_FILE_SUCCESS',
				data	: files,
			});
		} );

		return deferred.promise;
	}

	/**
	* Move file move to S3
	* @private
	* @param {string} filePath - file path move to S3
	* @param {string} storePath - Path to store file
	* @param {boolean} isPublic - Is public file
	* @return {promise}
	*/
	_moveToS3( filePath, storePath = 'temp', isPublic = true ) {
		const deferred = Q.defer();

		try {
			const imageBucket = path.join(
				this.s3Bucket, isPublic ? 'public' : 'non-public',
				'uploads', storePath
			);
			const fileInfo = path.parse( filePath );
			const stream = fs.createReadStream( filePath );
			const params = { Bucket: imageBucket, Key: fileInfo.base };

			// Read stream file error
			stream.on( 'error', error => {
				new Logger().write( 'error', error );
				deferred.reject( error );
			} );

			// Upload file to S3
			this.s3.putObject( { ...params, Body: stream }, ( error, data ) => {
				if ( error ) {
					new Logger().write( 'error', error );
					deferred.reject( error );
					return;
				}

				// Get file URL uploaded
				const fileUrl = url.parse( this.s3.getSignedUrl( 'getObject', params ) );

				deferred.resolve({
					status	: true,
					message	: 'MOVE_FILE_SUCCESS',
					data	: { url: fileUrl.protocol + '//' + fileUrl.host + fileUrl.pathname },
				});
			} );
		} catch ( error ) {
			new Logger().write( 'error', error );
			deferred.reject( error );
		}

		return deferred.promise;
	}

	/**
	* Get file extension
	* @private
	* @param {File} file - File to get extension
	* @return {string}
	*/
	_getFileExtension( file ) {
		let extension = path.extname( file.originalname ).split( '.' ).pop();

		if ( !extension && file.mimetype ) extension = file.mimetype.split( '/' )[ 1 ];

		return extension;
	}

}

module.exports = Uploader;
