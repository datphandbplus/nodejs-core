const routeCache = require( 'route-cache' );
const _ = require( 'underscore' );
const redis = require( 'redis' );
const expressRedisCache = require( 'express-redis-cache' );

const Factory = require( './factory' );

let CONFIG = {
	SERVER: Factory.getConfig( 'server' ) || {},
};

class ApiCache {

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
	* Create cache key string
	* @static
	* @param {array} keys - Keys to create key string
	* @return {string}
	*/
	static createKey( keys ) {
		return keys.join( '|' );
	}

	/**
	* Set cache
	* @static
	* @param {string} key - Key to set cache
	* @param {any} data - Data to set cache
	* @param {int} maxAge - Cache expire time
	* @return {void}
	*/
	static set( key, data, maxAge = 60000 ) {
		routeCache.cacheStore.set( key, JSON.stringify( data ), maxAge );
	}

	/**
	* Get cache
	* @static
	* @param {string} key - Key to get cache
	* @return {any}
	*/
	static get( key ) {
		const data = routeCache.cacheStore.get( key );
		return data ? JSON.parse( data ) : null;
	}

	/**
	* Has cache
	* @static
	* @param {string} key - Key to check has cache
	* @return {boolean}
	*/
	static has( key ) {
		return routeCache.cacheStore.has( key );
	}

	/**
	* Delete cache
	* @static
	* @param {string} key - Key to delete cache
	* @return {promise}
	*/
	static del( key ) {
		return routeCache.cacheStore.del( key );
	}

	/**
	* Local cache api
	* @static
	* @param {int} seconds - Expire time
	* @param {string} cacheKey - Cache key
	* @return {middleware}
	*/
	static localCache( seconds = 180, cacheKey = null ) {
		return routeCache.cacheSeconds( seconds, ( req, res ) => {
			const keys = [ req.originalUrl, cacheKey, res.locals.user_id ];

			if ( !_.isEmpty( req.query ) ) {
				keys.push( JSON.stringify( req.query ) );
			}

			return ApiCache.createKey( keys );
		} );
	}

	/**
	* Redis cache api
	* @static
	* @param {int} seconds - Expire time
	* @param {string} cacheKey - Cache key
	* @return {middleware}
	*/
	static redisCache( seconds = 180, cacheKey = null ) {
		const redisClient = redis.createClient();
		const redisCache = expressRedisCache( { client: redisClient } );

		return [
			( req, res, next ) => {
				const keys = [ req.originalUrl, cacheKey, res.locals.user_id ];
				res.express_redis_cache_name = ApiCache.createKey( keys );
				next();
			},
			redisCache.route(),
		];
	}

	/**
	* Cache api
	* @static
	* @param {int} seconds - Expire time
	* @param {string} cacheKey - Cache key
	* @return {middleware}
	*/
	static cache( seconds = 180, cacheKey = null ) {
		return CONFIG.SERVER.DEFAULT_CACHE === 'redis'
			? ApiCache.redisCache( seconds, cacheKey )
			: ApiCache.localCache( seconds, cacheKey );
	}

	/**
	* Local destroy api cache
	* @static
	* @param {any} res - Http response
	* @param {string} cacheKey - Cache key
	* @return {void}
	*/
	static localDestroy( res, cacheKey = null ) {
		const userCacheKey = ApiCache.createKey( [ cacheKey, res.locals.user_id ] );

		_.each( routeCache.cacheStore.keys(), key => {
			if ( key.search( userCacheKey ) < 0 ) return;
			ApiCache.del( key );
		} );
	}

	/**
	* Redis destroy api cache
	* @static
	* @param {any} res - Http response
	* @param {string} cacheKey - Cache key
	* @return {void}
	*/
	static redisDestroy( res, cacheKey = null ) {
		const redisClient = redis.createClient();
		const redisCache = expressRedisCache( { client: redisClient } );
		const userCacheKey = ApiCache.createKey( [ cacheKey, res.locals.user_id ] );

		redisCache.get( ( error, entries ) => {
			_.each( entries, entrie => {
				if ( entrie.name && entrie.name.search( userCacheKey ) < 0 ) return;
				redisCache.del( entrie.name, () => {} );
			} );
		} );
	}

	/**
	* Destroy api cache
	* @static
	* @param {any} res - Http response
	* @param {string} cacheKey - Cache key
	* @return {void}
	*/
	static destroy( res, cacheKey = null ) {
		CONFIG.SERVER.DEFAULT_CACHE === 'redis'
			? ApiCache.redisDestroy( res, cacheKey )
			: ApiCache.localDestroy( res, cacheKey );
	}

}

module.exports = ApiCache;
