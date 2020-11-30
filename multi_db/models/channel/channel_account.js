const Sequelize = require( 'sequelize' );

const Channel = require( './channel' );
const BaseModel = require( '../base' );
const Connection = require( '../../helpers/connection' );
const Logger = require( '../../helpers/logger' );

const ChannelAccount = new Connection()
.getConnection()
.define(
	'channel_account',
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
		username: {
			type		: Sequelize.STRING,
			allowNull	: false,
			validate	: { len: [ 1, 255 ] },
		},
		password: Sequelize.TEXT,
	},
	{
		underscored	: true,
		collate		: 'utf8_general_ci',
		indexes: [
			{
				unique: true,
				fields: [ 'channel_id', 'username' ],
			},
		],
	}
);

// Create table if not exists
ChannelAccount
.sync( { force: false, alter: true } )
.catch( error => {
	if ( BaseModel.checkModelError( error ) ) return;

	new Logger().write( 'error', error );
} );

Channel.hasMany( ChannelAccount );
ChannelAccount.belongsTo( Channel );

module.exports = ChannelAccount;
