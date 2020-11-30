const CryptoJS = require( 'crypto-js' );
const randomstring = require( 'randomstring' );

class Account {

	/**
	* Generate password
	* @return {object} Password hash & plain
	*/
	static generatePassword() {
		const password = randomstring.generate( 8 );

		return {
			hash	: CryptoJS.SHA256( password ).toString(),
			plain	: password,
		};
	}

}

module.exports = Account;
