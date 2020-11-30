const routeCache = require( 'route-cache' );
const _ = require( 'underscore' );
const redis = require( 'redis' );
const expressRedisCache = require( 'express-redis-cache' );

const ApiCacheBase = require( '../../helpers/api_cache' );
const Factory = require( '../../helpers/factory' );

let CONFIG = {
	SERVER: Factory.getConfig( 'server' ) || {},
};

class ApiCache extends ApiCacheBase {

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
	* Cache api
	* @static
	* @param {int} seconds - Expire time
	* @return {middleware}
	*/
	static cache( seconds = 180 ) {
		if ( CONFIG.SERVER.DEFAULT_CACHE === 'redis' ) {
			const redisClient = redis.createClient();
			const redisCache = expressRedisCache( { client: redisClient } );

			return [
				( req, res, next ) => {
					const keys = [ req.originalUrl, res.locals.channel_id, res.locals.user_id ];
					res.express_redis_cache_name = ApiCache.createKey( keys );
					next();
				},
				redisCache.route( { expire: seconds } ),
			];
		}

		return routeCache.cacheSeconds( seconds, ( req, res ) => {
			const keys = [ req.originalUrl, res.locals.channel_id, res.locals.user_id ];

			if ( !_.isEmpty( req.query ) ) {
				keys.push( JSON.stringify( req.query ) );
			}

			return ApiCache.createKey( keys );
		} );
	}

	/**
	* Destroy api cache
	* @static
	* @param {any} res - Http response
	* @return {void}
	*/
	static destroy( res ) {
		const channelCacheKey = ApiCache.createKey( [ 'CHANNEL', res.locals.channel_id ] );
		const userCacheKey = ApiCache.createKey( [ res.locals.channel_id, res.locals.user_id ] );

		if ( CONFIG.SERVER.DEFAULT_CACHE === 'redis' ) {
			const redisClient = redis.createClient();
			const redisCache = expressRedisCache( { client: redisClient } );

			redisCache.del( channelCacheKey, () => {} );

			redisCache.get( ( error, entries ) => {
				_.each( entries, entrie => {
					if ( entrie.name && entrie.name.search( userCacheKey ) < 0 ) return;
					redisCache.del( entrie.name, () => {} );
				} );
			} );
			return;
		}

		// Delete Channel cache
		ApiCache.del( channelCacheKey );

		// Delete User cache
		_.each( routeCache.cacheStore.keys(), key => {
			if ( key.search( userCacheKey ) < 0 ) return;

			ApiCache.del( key );
		} );
	}

}

module.exports = ApiCache;
