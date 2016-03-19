'use strict'


function createQueryProxy(connection, retries, minMillis, maxMillis) {
	retries = Number.isInteger(retries)? retries : 5
	minMillis = Number.isInteger(minMillis)? minMillis : 1
	maxMillis = Number.isInteger(maxMillis)? maxMillis : 100

	var orig = connection.query
	return function(sql, params, next) {
		var nextProxy = function(err,a,b,c,d,e,f) {
			var isMysqlDeadlockError = function(err) {
				return err && err.code==='ER_LOCK_DEADLOCK' && err.errno===1213 && err.sqlState==='40001'
			}
			if (isMysqlDeadlockError(err) && --retries) {
				var sleepMillis = Math.floor((Math.random()*maxMillis)+minMillis)
				setTimeout(function() {
					orig.apply(connection, [sql, params, nextProxy])
				}, sleepMillis)
			} else {
				next(err, a, b, c, d, e, f)
			}
		}
		orig.apply(connection, [sql, params, nextProxy])
	}
}


module.exports = createQueryProxy