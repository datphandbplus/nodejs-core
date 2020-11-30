const Q = require( 'q' );
const moment = require( 'moment-timezone' );

const CronTask = require( './cron_task' );
const Logger = require( '../../helpers/logger' );

class CronTaskRepository {

	/**
	* Get cron tasks
	* @param {string} functionName - Cron task function name
	* @param {Date} triggerDate - Cron task trigger date
	* @return {promise}
	*/
	async getCronTasks( functionName, triggerDate ) {
		const deferred = Q.defer();

		try {
			const cronTasks = await CronTask.findAll({
				where: {
					function	: functionName,
					trigger_date: triggerDate,
				},
			});

			deferred.resolve( cronTasks );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Delete cron tasks
	* @param {string} where - Where condition to delete
	* @return {promise}
	*/
	async deleteCronTasks( where ) {
		const deferred = Q.defer();

		try {
			const affectedRow = await CronTask.destroy( { where } );

			if ( !affectedRow ) {
				deferred.resolve({
					status	: false,
					message	: 'DELETE_CRON_TASKS_FAIL',
				});
				return deferred.promise;
			}

			deferred.resolve({
				status	: true,
				message	: 'DELETE_CRON_TASKS_SUCCESS',
			});
		} catch ( error ) {
			new Logger().write( 'error', error );
			deferred.reject( error );
		}

		return deferred.promise;
	}

	/**
	* Create delete temp file task
	* @param {string} channelId
	* @param {string} fileId
	* @param {string} filePath
	* @return {promise}
	*/
	async createDeleteTempFileTask( channelId, fileId, filePath ) {
		const deferred = Q.defer();

		try {
			const triggerDate = moment();

			triggerDate.add(
				triggerDate.minute() > 30 ? 2 : 1,
				'hours'
			).minute( 0 ).second( 0 );

			const result = await CronTask.create({
				channel_id	: channelId,
				trigger_date: triggerDate,
				function	: 'deleteTempFile',
				params		: JSON.stringify( { file_path: filePath } ),
				identify_key: 'DTF_F_' + fileId,
			});

			deferred.resolve( result );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

}

module.exports = CronTaskRepository;
