const _ = require( 'underscore' );
const moment = require( 'moment' );
const stringInject = require( 'stringinject' ).default;

const Factory = require( './factory' );

const STATUS_CODE = Factory.getResource( 'http_status_code' );
const BODY_VALIDATION_ERROR = Factory.getResource( 'body_validation_error' );

class Validator {

	/**
	* Custom validators
	* @static
	* @return {object}
	*/
	static get customValidators() {
		return {
			dateRange: ( value, range ) => {
				range = _.map( range, item => moment( item ).format( 'YYYY-MM-DD' ) );
				return _.contains( range, moment( value ).format( 'YYYY-MM-DD' ) );
			},
			isArrayLength: ( value, options ) => {
				return Array.isArray( value )
					&& ( !options.max || value.length <= options.max )
					&& ( !options.min || value.length >= options.min );
			},
		};
	}

	/**
	* Validate
	* @static
	* @param {any} req
	* @return {void}
	*/
	static async validate( req ) {
		const validate = await req.getValidationResult();

		if ( validate.isEmpty() ) return;

		const error = new Error();

		error.status = STATUS_CODE.BAD_REQUEST;
		error.message = validate.mapped();

		throw error;
	}

	/**
	* Error formatter
	* @static
	* @param {string} param
	* @param {string} message
	* @param {any} value
	* @param {string} location
	* @param {object} validatorCfg
	* @return {object}
	*/
	static errorFormatter(
		param, message, value,
		location, validatorCfg
	) {
		const namespace = param.split( '.' );

		let formParam = namespace.shift();

		while ( namespace.length ) formParam += '[' + namespace.shift() + ']';

		if ( !message ) {
			const validator = validatorCfg.validator;
			const options = validatorCfg.options;

			switch ( validator.name ) {
				case 'isLength':
					// Not Empty Validation
					if ( !_.has( options[ 0 ], 'max' ) ) {
						message = stringInject( BODY_VALIDATION_ERROR.REQUIRED, [ param ] );
					} else {
						message = stringInject(
							BODY_VALIDATION_ERROR.LENGTH,
							[ param, options[ 0 ].min, options[ 0 ].max ]
						);
					}
					break;
				case 'isInt':
				case 'isFloat':
				case 'isDouble':
					if ( !_.has( options[ 0 ], 'max' ) ) {
						message = stringInject( BODY_VALIDATION_ERROR.MIN, [ param, options[ 0 ].min ] );
					} else if ( !_.has( options[ 0 ], 'min' ) ) {
						message = stringInject( BODY_VALIDATION_ERROR.MAX, [ param, options[ 0 ].max ] );
					} else {
						message = stringInject(
							BODY_VALIDATION_ERROR.RANGE,
							[ param, options[ 0 ].min, options[ 0 ].max ]
						);
					}
					break;
				case 'isIn':
					message = stringInject( BODY_VALIDATION_ERROR.IN, [ param, options ] );
					break;
				default:
					message = stringInject( BODY_VALIDATION_ERROR.INVALID, [ param ] );
			}
		}

		return { value, message, param: formParam };
	}

}

module.exports = Validator;
