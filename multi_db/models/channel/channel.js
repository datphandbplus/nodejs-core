const Sequelize = require( 'sequelize' );

const BaseModel = require( '../base' );
const Connection = require( '../../helpers/connection' );
const Logger = require( '../../helpers/logger' );

const Channel = new Connection()
.getConnection()
.define(
	'channel',
	{
		id: {
			type		: Sequelize.STRING,
			allowNull	: false,
			validate	: { len: [ 1, 255 ] },
			primaryKey	: true,
		},
		name: {
			type		: Sequelize.STRING,
			allowNull	: false,
			validate	: { len: [ 1, 255 ] },
		},
		status: {
			type		: Sequelize.BOOLEAN,
			allowNull	: false,
			defaultValue: true,
		},
	},
	{
		underscored	: true,
		collate		: 'utf8_general_ci',
	}
);

// Create table if not exists
Channel
.sync( { force: false, alter: true } )
.catch( error => {
	if ( BaseModel.checkModelError( error ) ) return;

	new Logger().write( 'error', error );
} );

module.exports = Channel;
