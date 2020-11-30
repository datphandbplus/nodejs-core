const Sequelize = require( 'sequelize' );

const Channel = require( '../channel/channel' );
const BaseModel = require( '../base' );
const Connection = require( '../../helpers/connection' );
const Logger = require( '../../helpers/logger' );

const CronTask = new Connection()
.getConnection()
.define(
	'cron_task',
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
		trigger_date: {
			type		: Sequelize.DATE,
			defaultValue: Sequelize.NOW,
		},
		function	: Sequelize.TEXT( 'long' ),
		params		: Sequelize.TEXT( 'long' ),
		identify_key: Sequelize.STRING,
	},
	{
		underscored	: true,
		collate		: 'utf8_general_ci',
		indexes: [
			{
				unique: true,
				fields: [ 'identify_key' ],
			},
		],
	}
);

// Create table if not exists
CronTask
.sync( { force: false, alter: true } )
.catch( error => {
	if ( BaseModel.checkModelError( error ) ) return;

	new Logger().write( 'error', error );
} );

Channel.hasMany( CronTask );
CronTask.belongsTo( Channel );

module.exports = CronTask;
