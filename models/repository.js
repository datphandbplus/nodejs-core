const Q = require( 'q' );

const Logger = require( '../helpers/logger' );

class Repository {

	/**
	* @constructor
	* @param {any} model
	*/
	constructor( model ) {
		this.model = model;
	}

	/**
	* Get model name
	* @param {any} Model
	* @return {string}
	*/
	getModelName( Model ) {
		return Model.name.toUpperCase();
	}

	/**
	* Check model is virtual
	* @return {promise}
	*/
	async isVirtual() {
		const deferred = Q.defer();

		let Model;

		try {
			Model = await this.model;
		} catch {}

		deferred.resolve( Model && Model.is_virtual );

		return deferred.promise;
	}

	/**
	* Get all
	* @param {object} queryOptions
	* @return {promise}
	*/
	async getAll( queryOptions = {} ) {
		const deferred = Q.defer();

		try {
			if ( queryOptions && !queryOptions.order ) {
				queryOptions.order = [[ 'created_at', 'DESC' ]];
			}

			const Model = await this.model;
			const data = await Model.findAll( queryOptions );

			deferred.resolve( data );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Get one
	* @param {object} queryOptions
	* @return {promise}
	*/
	async getOne( queryOptions = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.findOne( queryOptions );

			deferred.resolve( data );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Get by pk
	* @param {int} pk
	* @param {object} queryOptions
	* @return {promise}
	*/
	async getByPk( pk, queryOptions = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.findByPk( pk, queryOptions );

			deferred.resolve( data );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Count
	* @param {object} queryOptions
	* @return {promise}
	*/
	async count( queryOptions = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.count( queryOptions );

			deferred.resolve( data );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Sum
	* @param {string} sumField
	* @param {object} queryOptions
	* @return {promise}
	*/
	async sum( sumField, queryOptions = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.sum( sumField, queryOptions );

			deferred.resolve( data );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Find and count all
	* @param {object} queryOptions
	* @return {promise}
	*/
	async findAndCountAll( queryOptions = {} ) {
		const deferred = Q.defer();

		try {
			if ( queryOptions && !queryOptions.order ) {
				queryOptions.order = [[ 'created_at', 'DESC' ]];
			}

			const Model = await this.model;
			const data = await Model.findAndCountAll( queryOptions );

			deferred.resolve( data );
		} catch ( error ) {
			new Logger().write( 'error', error );
			deferred.reject( error );
		}

		return deferred.promise;
	}


	/**
	* Find or create
	* @param {object} createOptions
	* @return {promise}
	*/
	async findOrCreate( createOptions ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.findOrCreate( createOptions );

			deferred.resolve( data );
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Create
	* @param {object} createData
	* @param {object} createOptions
	* @param {object} createMessages
	* @return {promise}
	*/
	async create( createData, createOptions = {}, createMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.create( createData, createOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: createMessages.fail || ( 'CREATE_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: createMessages.success || ( 'CREATE_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Update
	* @param {object} updateData
	* @param {object} updateOptions
	* @param {object} updateMessages
	* @return {promise}
	*/
	async update( updateData, updateOptions, updateMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const instance = await Model.findOne( { ...updateOptions, attributes: Model.primaryKeyAttributes } );

			if ( !instance ) {
				deferred.resolve({
					status	: false,
					message	: updateMessages.not_found || ( this.getModelName( Model ) + '_NOT_FOUND' ),
				});
				return deferred.promise;
			}

			const data = await instance.update( updateData, updateOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: updateMessages.fail || ( 'UPDATE_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: updateMessages.success || ( 'UPDATE_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Delete
	* @param {object} deleteOptions
	* @param {object} deleteMessages
	* @return {promise}
	*/
	async delete( deleteOptions, deleteMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const instance = await Model.findOne( { ...deleteOptions, attributes: Model.primaryKeyAttributes } );

			if ( !instance ) {
				deferred.resolve({
					status	: false,
					message	: deleteMessages.not_found || ( this.getModelName( Model ) + '_NOT_FOUND' ),
				});
				return deferred.promise;
			}

			const data = await instance.destroy( deleteOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: deleteMessages.fail || ( 'DELETE_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				status	: true,
				message	: deleteMessages.success || ( 'DELETE_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Increment
	* @param {object} incrementData
	* @param {object} incrementOptions
	* @param {object} incrementMessages
	* @return {promise}
	*/
	async increment( incrementData, incrementOptions, incrementMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const instance = await Model.findOne( { ...incrementOptions, attributes: Model.primaryKeyAttributes } );

			if ( !instance ) {
				deferred.resolve({
					status	: false,
					message	: incrementMessages.not_found || ( this.getModelName( Model ) + '_NOT_FOUND' ),
				});
				return deferred.promise;
			}

			const data = await instance.increment( incrementData, incrementOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: incrementMessages.fail || ( 'INCREMENT_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: incrementMessages.success || ( 'INCREMENT_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Decrement
	* @param {object} decrementData
	* @param {object} decrementOptions
	* @param {object} decrementMessages
	* @return {promise}
	*/
	async decrement( decrementData, decrementOptions, decrementMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const instance = await Model.findOne( { ...decrementOptions, attributes: Model.primaryKeyAttributes } );

			if ( !instance ) {
				deferred.resolve({
					status	: false,
					message	: decrementMessages.not_found || ( this.getModelName( Model ) + '_NOT_FOUND' ),
				});
				return deferred.promise;
			}

			const data = await instance.decrement( decrementData, decrementOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: decrementMessages.fail || ( 'DECREMENT_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: decrementMessages.success || ( 'DECREMENT_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Bulk create
	* @param {object} bulkCreateData
	* @param {object} bulkCreateOptions
	* @param {object} bulkCreateMessages
	* @return {promise}
	*/
	async bulkCreate( bulkCreateData, bulkCreateOptions, bulkCreateMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.bulkCreate( bulkCreateData, bulkCreateOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: bulkCreateMessages.fail || ( 'CREATE_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: bulkCreateMessages.success || ( 'CREATE_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Bulk update
	* @param {object} bulkUpdateData
	* @param {object} bulkUpdateOptions
	* @param {object} bulkUpdateMessages
	* @return {promise}
	*/
	async bulkUpdate( bulkUpdateData, bulkUpdateOptions, bulkUpdateMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.update( bulkUpdateData, bulkUpdateOptions );

			if ( !data || !data.length ) {
				deferred.resolve({
					status	: false,
					message	: bulkUpdateMessages.fail || ( 'BULK_UPDATE_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: bulkUpdateMessages.success || ( 'BULK_UPDATE_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Bulk delete
	* @param {object} bulkDeleteOptions
	* @param {object} bulkDeleteMessages
	* @return {promise}
	*/
	async bulkDelete( bulkDeleteOptions, bulkDeleteMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.destroy( bulkDeleteOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: bulkDeleteMessages.fail || ( 'BULK_DELETE_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				status	: true,
				message	: bulkDeleteMessages.success || ( 'BULK_DELETE_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Bulk Increment
	* @param {object} bulkIncrementData
	* @param {object} bulkIncrementOptions
	* @param {object} bulkIncrementMessages
	* @return {promise}
	*/
	async bulkIncrement( bulkIncrementData, bulkIncrementOptions, bulkIncrementMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.increment( bulkIncrementData, bulkIncrementOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: bulkIncrementMessages.fail || ( 'BULK_INCREMENT_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: bulkIncrementMessages.success || ( 'BULK_INCREMENT_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

	/**
	* Bulk Decrement
	* @param {object} bulkDecrementData
	* @param {object} bulkDecrementOptions
	* @param {object} bulkDecrementMessages
	* @return {promise}
	*/
	async bulkDecrement( bulkDecrementData, bulkDecrementOptions, bulkDecrementMessages = {} ) {
		const deferred = Q.defer();

		try {
			const Model = await this.model;
			const data = await Model.decrement( bulkDecrementData, bulkDecrementOptions );

			if ( !data ) {
				deferred.resolve({
					status	: false,
					message	: bulkDecrementMessages.fail || ( 'BULK_DECREMENT_' + this.getModelName( Model ) + '_FAIL' ),
				});
				return deferred.promise;
			}

			deferred.resolve({
				data,
				status	: true,
				message	: bulkDecrementMessages.success || ( 'BULK_DECREMENT_' + this.getModelName( Model ) + '_SUCCESS' ),
			});
		} catch ( error ) {
			deferred.reject( error );
			new Logger().write( 'error', error );
		}

		return deferred.promise;
	}

}

module.exports = Repository;
