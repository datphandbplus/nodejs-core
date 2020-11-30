const Q = require( 'q' );

module.exports = async ( model, data, where = null, forceUpdate = true ) => {
	const deferred = Q.defer();

	try {
		if ( !where ) where = data;

		const [ result, created ] = await model.findOrCreate({
			where, defaults: data,
		});

		if ( !created && forceUpdate ) {
			result.update( data );
		}

		deferred.resolve( result );
	} catch ( error ) {
		deferred.reject( error );
	}

	return deferred.promise;
};
