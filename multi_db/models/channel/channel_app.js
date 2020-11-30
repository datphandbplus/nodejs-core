const Sequelize = require( 'sequelize' );

const Channel = require( './channel' );
const BaseModel = require( '../base' );
const Connection = require( '../../helpers/connection' );
const Logger = require( '../../helpers/logger' );

const ChannelApp = new Connection()
.getConnection()
.define(
	'channel_app',
	{
		channel_id: {
			type		: Sequelize.STRING,
			onUpdate	: 'CASCADE',
			onDelete	: 'CASCADE',
			allowNull	: false,
			references: {
				model	: Channel,
				key		: 'id',
			},
		},
		name: {
			type		: Sequelize.STRING,
			allowNull	: false,
			validate	: { len: [ 1, 255 ] },
		},
		title: {
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
		indexes: [
			{
				unique: true,
				fields: [ 'channel_id', 'name' ],
			},
		],
	}
);

// Create table if not exists
ChannelApp
.sync( { force: false, alter: true } )
.catch( error => {
	if ( BaseModel.checkModelError( error ) ) return;

	new Logger().write( 'error', error );
} );

Channel.hasMany( ChannelApp );
ChannelApp.belongsTo( Channel );

module.exports = ChannelApp;
