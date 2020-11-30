const jwt = require( 'jsonwebtoken' );
const CryptoJS = require( 'crypto-js' );

const Factory = require( './factory' );

let CONFIG = {
	HASH: Factory.getConfig( 'hash' ) || {},
};

class TokenGenerator {

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
	* Encrypt data
	* @static
	* @param {string} data - Data to encrypt
	* @param {boolean} isExpired - Flag to set expired token
	* @param {int} expiresIn - Expire time
	* @return {string} Token encrypted
	*/
	static encrypt( data, isExpired = true, expiresIn = 0 ) {
		const options = isExpired ? { expiresIn: expiresIn || CONFIG.HASH.EXPIRE_DAYS } : {};
		const token = jwt.sign( data, CONFIG.HASH.JWT_HASH_KEY, options );

		return CryptoJS.AES.encrypt( token, CONFIG.HASH.CRYPTO_HASH_KEY ).toString();
	}

	/**
	* Decrypt token
	* @static
	* @param {string} token - Token need decrypt
	* @return {any} Data decrypted
	*/
	static decrypt( token ) {
		let decoded;

		try {
			const bytes = CryptoJS.AES.decrypt( token, CONFIG.HASH.CRYPTO_HASH_KEY );
			const rawValue = bytes.toString( CryptoJS.enc.Utf8 );

			decoded = jwt.verify( rawValue, CONFIG.HASH.JWT_HASH_KEY );
		} catch {}

		return decoded;
	}

	/**
	* Decrypt password token
	* @static
	* @param {string} token - Password token need decrypt
	* @return {any} Data decrypted
	*/
	static passwordDecrypt( token ) {
		let decoded;

		try {
			const bytes = CryptoJS.AES.decrypt( token, CONFIG.HASH.PASSWORD_HASH_KEY );
			decoded = bytes.toString( CryptoJS.enc.Utf8 );
		} catch {}

		return decoded;
	}

	/**
	* Check secure hash
	* @static
	* @param {any} hashData
	* @param {any} secureHash
	* @return {boolean}
	*/
	static checkSecureHash( hashData, secureHash ) {
		const appSecureHash = CryptoJS.MD5( CONFIG.HASH.JWT_HASH_KEY + hashData ).toString();
		return appSecureHash === secureHash;
	}

}

module.exports = TokenGenerator;
