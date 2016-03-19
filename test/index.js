"use strict";

var assert = require('assert')
var async = require('async')
var proxyMysqlDeadlockRetries = require('../index')




// Proxy db
var makeDeadlockError = () => {
	var err = new Error('Deadlock error')
	err.code = 'ER_LOCK_DEADLOCK'
	err.errno = 1213
	err.sqlState = '40001'
	return err
}

var mode = 1
var queries = 0

var mode4Counter = 0
var mode5Counter = 0

var db = {
	query: (sql, params, next) => {
		++queries
		setTimeout(() => {
			switch (mode) {
				case 1: // Success
					next(null, 'mysql-result')
					break

				case 2: // Normal fail
					next(new Error('Syntax error in sql'))
					break

				case 3: // Deadlock fail
					next(makeDeadlockError())
					break

				case 4: // Deadlock fail 2 times then success
					if (mode4Counter++ < 2) {
						next(makeDeadlockError())
					} else {
						next(null, 'mysql-result')
					}
					break

				case 5: // Deadlock fail 2 times then normal fail
					if (mode5Counter++ < 2) {
						next(makeDeadlockError())
					} else {
						next(new Error('Syntax error in sql'))
					}
					break
			}
		}, 200)
	}
}



var cfg = {
	retries: 5,
	minMillis: 1,
	maxMillis: 50
}

db.query = proxyMysqlDeadlockRetries(db, cfg.retries, cfg.minMillis, cfg.maxMillis)


describe('Testing mysql-deadlock-retries', () => {
	var isMysqlDeadlockError = (err) => err && err.code==='ER_LOCK_DEADLOCK' && err.errno===1213 && err.sqlState==='40001'

	it('executes only once when query successful', (next) => {
		mode = 1
		queries = 0
		db.query('', [], (err, result) => {
			assert.equal(err, null)
			assert.equal(result, 'mysql-result')
			assert.equal(queries, 1)
			next()
		})
	})

	it('executes only once on faulty operation', (next) => {
		mode = 2
		queries = 0
		db.query('', [], (err, result) => {
			assert.notEqual(err, null)
			assert.ok(!isMysqlDeadlockError(err))
			assert.equal(queries, 1)
			next()
		})
	})

	it('keeps retrying deadlocking operation', (next) => {
		mode = 3
		queries = 0
		db.query('', [], (err, result) => {
			assert.notEqual(err, null)
			assert.ok(isMysqlDeadlockError(err))
			assert.equal(queries, cfg.retries)
			next()
		})
	})

	it('succeeds when deadlocks no longer occur', (next) => {
		mode = 4
		queries = 0
		db.query('', [], (err, result) => {
			assert.equal(err, null)
			assert.equal(queries, 3)
			next()
		})
	})

	it('handles real fail after deadlocks', (next) => {
		mode = 5
		queries = 0
		db.query('', [], (err, result) => {
			assert.notEqual(err, null)
			assert.ok(!isMysqlDeadlockError(err))
			assert.equal(queries, 3)
			next()
		})
	})
})
